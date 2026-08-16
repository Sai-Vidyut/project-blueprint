export function AppBackdrop() {
  return (
    <>
      <div
        aria-hidden="true"
        className="bg-ambient-orbs pointer-events-none absolute inset-0"
      />
      <div
        aria-hidden="true"
        className="bg-page-glow pointer-events-none absolute inset-x-0 top-0 h-[32rem]"
      />
      <div
        aria-hidden="true"
        className="bg-page-grid pointer-events-none absolute inset-x-0 top-0 h-[32rem]"
      />
    </>
  );
}
