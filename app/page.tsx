import React from "react";
import Phone from "@/components/screens/Phone";

const Page = () => {
  return (
    <div className="flex-center h-[100dvh] min-h-0 w-full overflow-hidden p-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]">
      <Phone />
    </div>
  );
};
export default Page;
