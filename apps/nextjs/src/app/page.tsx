import { Suspense } from "react";

import { HydrateClient } from "~/trpc/server";

export default function HomePage() {
  return (
    <HydrateClient>
      <main className="container h-screen py-16">
        <div className="flex flex-col items-center justify-center gap-4">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
            Create <span className="text-primary">T3</span> Turbo
          </h1>

          <div className="w-full max-w-2xl overflow-y-scroll">
            <Suspense
              fallback={
                <div className="flex w-full flex-col gap-4">
                  <div className="h-16 w-full animate-pulse rounded-md bg-gray-200" />
                  <div className="h-16 w-full animate-pulse rounded-md bg-gray-200" />
                </div>
              }
            >
              <div className="h-16 w-full animate-pulse rounded-md bg-gray-200" />
            </Suspense>
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}
