'use client'

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-6">
        <div className="relative">
          <div className="animate-[spin_1s_linear_infinite] rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
          <div className="absolute top-0 animate-[spin_1s_linear_infinite_reverse] rounded-full h-16 w-16 border-4 border-indigo-500 border-t-transparent"></div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-[bounce_1s_infinite]"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-[bounce_1s_infinite_150ms]"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-[bounce_1s_infinite_300ms]"></div>
        </div>
        <p className="text-indigo-600 text-lg font-medium tracking-wide">Loading...</p>
      </div>
    </div>
  )
}
