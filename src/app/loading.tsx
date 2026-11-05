export default function GlobalLoading() {
  return (
    <div
      role="status"
      aria-label="Loading page"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-xs"
    >
      <div className="flex flex-col items-center gap-6 px-6 text-center animate-pulse">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/gdg-vcet-logo.png"
          alt="Google Developer Groups on Campus · VCET"
          width={517}
          height={66}
          className="h-9 sm:h-11 w-auto max-w-[280px] sm:max-w-[360px] object-contain drop-shadow-xs"
        />

        {/* 4-Color Google Brand Loading Bar */}
        <div className="w-48 sm:w-56 h-1 rounded-full bg-slate-100 overflow-hidden relative shadow-inner">
          <div className="absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853] rounded-full animate-loader-slide"></div>
        </div>
      </div>
    </div>
  );
}
