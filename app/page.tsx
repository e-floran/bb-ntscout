import { cookies } from "next/headers";

export default async function IndexPage() {
  const cookieStore = await cookies();
  const authenticated = cookieStore.get("authenticated_user")?.value;

  return (
    <main className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl font-bold mb-4">Welcome!</h1>
      {authenticated ? (
        <div className="text-lg">
          You are logged in as <b>{authenticated}</b>.
        </div>
      ) : (
        <div className="text-lg text-red-600">
          You are not logged in.{" "}
          <a href="/login" className="underline text-blue-600">
            Go to Login
          </a>
        </div>
      )}
    </main>
  );
}
