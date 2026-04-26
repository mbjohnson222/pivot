export default function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_20%),radial-gradient(circle_at_20%_18%,rgba(251,191,36,0.1),transparent_18%),linear-gradient(180deg,#030712_0%,#091127_48%,#020617_100%)] px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
          Privacy Policy
        </div>

        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Pivot Galaxy Privacy Policy
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          Effective date: April 26, 2026
        </p>

        <div className="mt-10 space-y-8 text-sm leading-7 text-slate-200">
          <section>
            <h2 className="text-xl font-semibold text-white">Overview</h2>
            <p className="mt-3">
              Pivot Galaxy is a puzzle game. This policy explains what information the app uses,
              how that information supports gameplay, and what third-party services are involved.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Information We Collect</h2>
            <p className="mt-3">
              When you create an account, the app uses your email address, password, and chosen
              username through Supabase Authentication.
            </p>
            <p className="mt-3">
              The app also stores gameplay-related data such as level progress, stars, fuel,
              leaderboard scores, and daily challenge results so your progress can persist across
              sessions and devices.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">How We Use Information</h2>
            <p className="mt-3">We use account and gameplay data to:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-300">
              <li>sign you in securely</li>
              <li>save and restore progress across devices</li>
              <li>show leaderboards and daily challenge results</li>
              <li>support in-game systems like stars, fuel, and hints</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Advertising</h2>
            <p className="mt-3">
              Pivot Galaxy uses Google AdMob rewarded ads. When you choose to watch an ad for a
              reward, AdMob may collect device and advertising-related data in accordance with
              Google&apos;s policies.
            </p>
            <p className="mt-3">
              Learn more here:{" "}
              <a
                href="https://policies.google.com/privacy"
                className="text-cyan-200 underline underline-offset-4"
              >
                Google Privacy Policy
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Purchases</h2>
            <p className="mt-3">
              If in-app purchases are enabled, purchases are processed by Apple and Google through
              their platform billing systems. We do not store full payment card information in the
              app.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Data Storage</h2>
            <p className="mt-3">
              Gameplay state may be stored locally on your device and synced with backend services
              used by the app, including Supabase, to support account-based progress.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Your Choices</h2>
            <p className="mt-3">
              You can stop using the app at any time. If you no longer want gameplay or account
              data associated with your account, you should also remove the app and contact support
              through the support page linked from the App Store listing.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Contact</h2>
            <p className="mt-3">
              For support information, please visit the Pivot Galaxy support page linked alongside
              this policy in the app listing.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
