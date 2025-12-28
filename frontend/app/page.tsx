"use client"

import Image from "next/image";

export default function Home() {
  const { data, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div>
        <h1>Loading...</h1>
      </div>
    )
  }

  return (
    <div>
      <h1>H</h1>
    </div>
  );
}
