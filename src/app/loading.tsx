export default function GlobalLoading() {
  return (
    <div
      role="status"
      aria-label="Loading page"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-xs"
    >
      <div className="flex flex-col items-center gap-5 px-6 text-center animate-pulse">
        {/* Official GDG Logo in White Squared Background */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white border border-slate-200/90 shadow-md flex items-center justify-center p-3 sm:p-3.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/gdg-logo-square.svg"
            alt="Google Developer Groups"
            width={96}
            height={96}
            className="w-full h-full object-contain"
          />
        </div>

        {/* 4-Color Google Brand Loading Bar */}
        <div className="w-40 sm:w-48 h-1 rounded-full bg-slate-100 overflow-hidden relative shadow-inner">
          <div className="absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853] rounded-full animate-loader-slide"></div>
        </div>
      </div>
    </div>
  );
}
