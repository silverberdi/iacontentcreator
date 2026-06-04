import type { ReactNode } from "react";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
};

export default function PageContainer({ children, className = "" }: PageContainerProps) {
  return (
    <div className={`mx-auto w-[95vw] max-w-[1900px] px-4 sm:px-6 ${className}`}>
      {children}
    </div>
  );
}
