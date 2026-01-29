import { createServerClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: settings } = await supabase
    .from("wedding_settings")
    .select("*")
    .eq("user_id", user?.id)
    .single();

  const { data: guests } = await supabase
    .from("guests")
    .select("id")
    .eq("user_id", user?.id);

  const totalGuests = guests?.length || 0;

  if (!settings) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 mb-6">Dashboard</h1>
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-medium text-rose-800 mb-2">
            Welcome! Get started by setting up your wedding.
          </h2>
          <p className="text-rose-600 mb-4">
            First, set up your wedding details.
          </p>
          <Link
            href="/settings"
            className="inline-block bg-rose-500 text-white px-4 py-2 rounded-lg"
          >
            Set Up Wedding
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">Dashboard</h1>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-xl font-serif text-gray-800 mb-2">
          {settings.couple_names}
        </h2>
        <p className="text-gray-600">{settings.venue_name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-2xl font-semibold text-gray-800">{totalGuests}</p>
          <p className="text-sm text-gray-500">Total Invitations</p>
        </div>
      </div>
    </div>
  );
}
