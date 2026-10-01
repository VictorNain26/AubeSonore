/** Static 404, pre-rendered once for both languages (nginx serves it for any unknown path). */
export function NotFoundPage() {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden">
      <div aria-hidden="true" className="dawn-band" />
      <div className="relative z-10 flex flex-1 flex-col justify-center gap-6 px-6 md:px-10">
        <h1 className="text-section m-0">Rien à cette adresse.</h1>
        <p lang="en" className="text-intro text-text-muted m-0">
          Nothing at this address.
        </p>
        <p className="text-ui m-0 flex flex-wrap gap-x-6">
          <a href="/" className="underline decoration-1 underline-offset-4 hover:decoration-2">
            Retour à l&apos;antenne
          </a>
          <a
            href="/en/"
            lang="en"
            className="underline decoration-1 underline-offset-4 hover:decoration-2"
          >
            Back to the radio
          </a>
        </p>
      </div>
      <p className="text-logo condensed relative z-10 m-0 px-6 pb-10 md:px-10">aubesonore</p>
    </main>
  );
}
