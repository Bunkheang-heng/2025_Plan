import { redirect } from 'next/navigation'

export default function SetupRedirect() {
  redirect('/checklist_setup?tab=setup')
}
