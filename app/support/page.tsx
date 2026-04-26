export default function SupportPage() {
  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_20%),radial-gradient(circle_at_20%_18%,rgba(251,191,36,0.1),transparent_18%),linear-gradient(180deg,#030712_0%,#091127_48%,#020617_100%)] px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
          Support
        </div>

        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Pivot Galaxy Support
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-300">
          Help for account access, gameplay issues, purchases, and general troubleshooting.
        </p>

        <div className="mt-10 space-y-8 text-sm leading-7 text-slate-200">
          <section>
            <h2 className="text-xl font-semibold text-white">Common Issues</h2>
            <div className="mt-4 space-y-4">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-base font-semibold text-white">
                  My progress or stars are missing
                </h3>
                <p className="mt-2 text-slate-300">
                  Make sure you&apos;re signed into the same account you originally used. Account
                  progress is tied to your email and username combination.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-base font-semibold text-white">
                  Rewarded ads did not grant a reward
                </h3>
                <p className="mt-2 text-slate-300">
                  Rewarded ads usually require a full completion to grant fuel, stars, or extra
                  attempts. If the ad closes early or fails to load, the reward may not be added.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-base font-semibold text-white">
                  A purchase did not appear
                </h3>
                <p className="mt-2 text-slate-300">
                  Confirm that the purchase completed through the App Store or Play Store account
                  on your device. If the item still doesn&apos;t appear, reopen the app and retry
                  the restore or sync flow if one is available.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">What to Include in a Support Request</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-300">
              <li>your username</li>
              <li>your device type, such as iPhone or iPad</li>
              <li>your OS version</li>
              <li>a short description of what happened</li>
              <li>screenshots if the issue is visual</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Support Contact</h2>
            <p className="mt-3">
              If you are preparing your App Store listing, add your preferred support email to this
              page before launch so players know how to contact you directly.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
