//+------------------------------------------------------------------+
//|  TradeTracker.mq5                                                |
//|  Sends every closed trade to your Next.js app (Firebase backend)|
//|                                                                  |
//|  SETUP:                                                          |
//|  1. Deploy myPlan; set .env FIREBASE_SERVICE_ACCOUNT (Admin SDK)|
//|  2. Web: Trading → MT5 trade log — token auto-created on first load|
//|  3. EA: InpAppBaseURL = .env APP_URL; InpIngestToken = Bearer token |
//|  4. MT5: Tools → Options → Expert Advisors → Allow WebRequest    |
//|     Add same host as APP_URL, e.g. https://plan2025.vercel.app   |
//|  5. Attach EA to any chart (e.g. EURUSD M1)                      |
//+------------------------------------------------------------------+
#property copyright "TradeTracker"
#property version   "1.20"
#property strict

//--- Inputs — POST /api/mt5/trades (Bearer only; no query string)
input string  InpAppBaseURL  = "https://plan2025.vercel.app";   // = APP_URL in .env (no trailing /)
input string  InpIngestToken = "PASTE_BEARER_FROM_MT5_TRADE_LOG_PAGE"; // Trading → MT5 trade log
input bool    InpDebugMode      = true;                                 // Print debug logs

//--- Track open positions to capture SL/TP before close
struct PositionInfo {
   long     positionId;
   double   sl;
   double   tp;
   string   tradeType;
   double   openPrice;
   datetime openTime;
   double   lotSize;
   string   symbol;
   string   comment;
   long     magic;
};

PositionInfo openPositions[];

//+------------------------------------------------------------------+
bool SelectPositionByIdentifier(long posId)
{
   for(int i = 0; i < PositionsTotal(); i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(!PositionSelectByTicket(ticket)) continue;
      if((long)PositionGetInteger(POSITION_IDENTIFIER) == posId)
         return true;
   }
   return false;
}

//+------------------------------------------------------------------+
void OnInit()
{
   // Snapshot all currently open positions at startup
   RefreshOpenPositions();
   Print("[TradeTracker] EA initialized. Monitoring ", PositionsTotal(), " open positions.");
}

//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction &trans,
                        const MqlTradeRequest     &request,
                        const MqlTradeResult      &result)
{
   //--- Update SL/TP cache when positions are modified
   if(trans.type == TRADE_TRANSACTION_POSITION)
   {
      UpdatePositionCache(trans.position);
   }

   //--- A new deal was added – check if it's a closing deal
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
   {
      ulong dealTicket = trans.deal;
      if(!HistoryDealSelect(dealTicket)) return;

      ENUM_DEAL_ENTRY entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
      if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_INOUT)
      {
         SendTradeToFirebase(dealTicket);
      }

      //--- Also remove from open positions cache
      if(entry == DEAL_ENTRY_OUT)
      {
         long posId = HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
         RemovePositionFromCache(posId);
      }
   }

   //--- Track newly opened positions
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
   {
      ulong dealTicket = trans.deal;
      if(!HistoryDealSelect(dealTicket)) return;
      ENUM_DEAL_ENTRY entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
      if(entry == DEAL_ENTRY_IN)
      {
         AddPositionToCache(HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID));
      }
   }
}

//+------------------------------------------------------------------+
void SendTradeToFirebase(ulong dealTicket)
{
   if(!HistoryDealSelect(dealTicket)) { Print("[TradeTracker] Cannot select deal: ", dealTicket); return; }

   long     positionId   = HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
   string   symbol       = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
   double   closePrice   = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
   double   profit       = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
   double   commission   = HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
   double   swap         = HistoryDealGetDouble(dealTicket, DEAL_SWAP);
   double   lotSize      = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
   long     magic        = HistoryDealGetInteger(dealTicket, DEAL_MAGIC);
   string   comment      = HistoryDealGetString(dealTicket, DEAL_COMMENT);
   datetime closeTime    = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);

   //--- Get open-deal info from history
   double   openPrice  = 0;
   datetime openTime   = 0;
   string   tradeType  = "BUY";
   double   sl         = 0;
   double   tp         = 0;

   //--- Try cached position info first (has SL/TP)
   int cacheIdx = FindPositionInCache(positionId);
   if(cacheIdx >= 0)
   {
      sl        = openPositions[cacheIdx].sl;
      tp        = openPositions[cacheIdx].tp;
      openPrice = openPositions[cacheIdx].openPrice;
      openTime  = openPositions[cacheIdx].openTime;
      tradeType = openPositions[cacheIdx].tradeType;
      if(lotSize == 0) lotSize = openPositions[cacheIdx].lotSize;
      if(comment == "") comment = openPositions[cacheIdx].comment;
      if(magic   == 0) magic   = openPositions[cacheIdx].magic;
   }
   else
   {
      //--- Fallback: scan history for opening deal
      HistorySelect(0, TimeCurrent());
      int total = HistoryDealsTotal();
      for(int i = 0; i < total; i++)
      {
         ulong t = HistoryDealGetTicket(i);
         if(HistoryDealGetInteger(t, DEAL_POSITION_ID) == positionId)
         {
            ENUM_DEAL_ENTRY e = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(t, DEAL_ENTRY);
            if(e == DEAL_ENTRY_IN)
            {
               openPrice = HistoryDealGetDouble(t, DEAL_PRICE);
               openTime  = (datetime)HistoryDealGetInteger(t, DEAL_TIME);
               ENUM_DEAL_TYPE dt = (ENUM_DEAL_TYPE)HistoryDealGetInteger(t, DEAL_TYPE);
               tradeType = (dt == DEAL_TYPE_BUY) ? "BUY" : "SELL";
               break;
            }
         }
      }
   }

   //--- Calculate pips
   double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
   int    digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
   double pipFactor = (digits == 5 || digits == 3) ? 10.0 : 1.0;
   double pipSize = point * pipFactor;
   double pips = 0;
   if(openPrice > 0 && pipSize > 0)
      pips = (tradeType == "BUY") ? (closePrice - openPrice) / pipSize
                                   : (openPrice - closePrice) / pipSize;

   //--- Format times as ISO-8601
   string openTimeStr  = FormatISO(openTime);
   string closeTimeStr = FormatISO(closeTime);

   //--- Escape any double-quotes in comment
   StringReplace(comment, "\"", "'");

   //--- Build JSON
   string json = StringFormat(
      "{"
        "\"ticket\":%lld,"
        "\"symbol\":\"%s\","
        "\"trade_type\":\"%s\","
        "\"lot_size\":%.2f,"
        "\"open_price\":%.5f,"
        "\"close_price\":%.5f,"
        "\"open_time\":\"%s\","
        "\"close_time\":\"%s\","
        "\"sl\":%.5f,"
        "\"tp\":%.5f,"
        "\"profit\":%.2f,"
        "\"pips\":%.1f,"
        "\"commission\":%.2f,"
        "\"swap\":%.2f,"
        "\"magic_number\":%lld,"
        "\"comment\":\"%s\""
      "}",
      (long)dealTicket, symbol, tradeType,
      lotSize, openPrice, closePrice,
      openTimeStr, closeTimeStr,
      sl, tp, profit, pips,
      commission, swap, magic, comment
   );

   if(InpDebugMode) Print("[TradeTracker] Payload: ", json);

   //--- HTTP POST → Next.js API → Firestore (Firebase Admin on server)
   string base = InpAppBaseURL;
   int n = StringLen(base);
   if(n > 0 && StringGetCharacter(base, n - 1) == '/')
      base = StringSubstr(base, 0, n - 1);
   string url = base + "/api/mt5/trades";
   string headers = "Content-Type: application/json\r\n"
                  + "Authorization: Bearer " + InpIngestToken + "\r\n";

   char   postData[];
   char   response[];
   string responseHeaders;
   StringToCharArray(json, postData, 0, StringLen(json));

   ResetLastError();
   int httpCode = WebRequest("POST", url, headers, 5000, postData, response, responseHeaders);

   if(httpCode == 201)
      Print("[TradeTracker] ✅ Trade ", dealTicket, " (", symbol, " ", tradeType, " ", DoubleToString(pips,1), " pips / $", DoubleToString(profit,2), ") saved.");
   else
      Print("[TradeTracker] ❌ Failed. HTTP:", httpCode, " WinError:", GetLastError(), " Response:", CharArrayToString(response));
}

//+------------------------------------------------------------------+
//| Cache helpers                                                     |
//+------------------------------------------------------------------+
void RefreshOpenPositions()
{
   ArrayResize(openPositions, 0);
   int total = PositionsTotal();
   for(int i = 0; i < total; i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(!PositionSelectByTicket(ticket)) continue;
      long posId = (long)PositionGetInteger(POSITION_IDENTIFIER);
      AddPositionToCache(posId);
   }
}

void AddPositionToCache(long posId)
{
   if(FindPositionInCache(posId) >= 0) return; // already cached
   int idx = ArraySize(openPositions);
   ArrayResize(openPositions, idx + 1);

   if(SelectPositionByIdentifier(posId))
   {
      openPositions[idx].positionId = posId;
      openPositions[idx].sl         = PositionGetDouble(POSITION_SL);
      openPositions[idx].tp         = PositionGetDouble(POSITION_TP);
      openPositions[idx].openPrice  = PositionGetDouble(POSITION_PRICE_OPEN);
      openPositions[idx].openTime   = (datetime)PositionGetInteger(POSITION_TIME);
      openPositions[idx].lotSize    = PositionGetDouble(POSITION_VOLUME);
      openPositions[idx].symbol     = PositionGetString(POSITION_SYMBOL);
      openPositions[idx].comment    = PositionGetString(POSITION_COMMENT);
      openPositions[idx].magic      = PositionGetInteger(POSITION_MAGIC);
      ENUM_POSITION_TYPE pt = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
      openPositions[idx].tradeType  = (pt == POSITION_TYPE_BUY) ? "BUY" : "SELL";
   }
}

void UpdatePositionCache(long posId)
{
   int idx = FindPositionInCache(posId);
   if(idx < 0) { AddPositionToCache(posId); return; }
   if(SelectPositionByIdentifier(posId))
   {
      openPositions[idx].sl = PositionGetDouble(POSITION_SL);
      openPositions[idx].tp = PositionGetDouble(POSITION_TP);
   }
}

void RemovePositionFromCache(long posId)
{
   int idx = FindPositionInCache(posId);
   if(idx < 0) return;
   int size = ArraySize(openPositions);
   for(int i = idx; i < size - 1; i++)
      openPositions[i] = openPositions[i+1];
   ArrayResize(openPositions, size - 1);
}

int FindPositionInCache(long posId)
{
   for(int i = 0; i < ArraySize(openPositions); i++)
      if(openPositions[i].positionId == posId) return i;
   return -1;
}

string FormatISO(datetime dt)
{
   MqlDateTime s;
   TimeToStruct(dt, s);
   return StringFormat("%04d-%02d-%02dT%02d:%02d:%02d",
      s.year, s.mon, s.day, s.hour, s.min, s.sec);
}
