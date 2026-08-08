import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "About",
  description: "What we are, why we exist, and what we're not apologizing for. Anti-establishment tools rooted in ancient knowledge.",
};

export default function AboutPage() {
  return (
    <main className={styles.main}>
      {/* Content */}
      <div className={styles.content}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>What is this</h2>
          <p>
            It&apos;s 2026. And if you haven&apos;t noticed yet, the world has
            lost its fucking collective mind. But can you blame us? We&apos;re
            under constant attack from all but confirmed non-human entities
            controlling the &quot;elite&quot; class, who apparently legitimately
            eats babies. And these are the people telling you to get an
            experimental jab? We&apos;re intheGno. That we should just be okay with our
            skies being sprayed? We&apos;re intheGno. That a data center or 6G tower can
            wreak havoc on your town without your consent? We&apos;re intheGno. That
            it&apos;s okay to let unvetted criminals make your streets a
            crime-dodging obstacle course? We&apos;re intheGno. At intheGno... we give
            you the tools to tell these fuckers, &quot;No thanks.&quot;
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Why we exist</h2>
          <p>
            Everyone&apos;s screaming past each other. Left vs. right, atheist
            vs. Christian, science vs. New Age. And nobody&apos;s asking why
            every answer is a binary. As above, so below.{" "}
            {/* Was hard-linked to /blog/truth-isnt-linear, which is unpublished
                and therefore 404s. Pointed at the Observations index so this
                page stays fully static (no DB read on /about). Repoint it at
                the post once it is published. */}
            <Link href="/blog" className={styles.inlineLink}>
              Truth isn&apos;t absolute.
            </Link>
          </p>
          <p>
            &quot;Gno&quot; comes from Gnosis. Ancient Greek for knowledge. Not
            the kind you get from any authority figure. The kind you get from
            shutting the fuck up and listening to yourself. We&apos;re not
            scientists. We&apos;re not gurus. We&apos;re not a cult. We&apos;ll
            tell you straight up: what we sell hasn&apos;t been &quot;100%
            studied.&quot; We know that. But has science not distorted reality
            for profit every single day? Pharma. Food. Telecom. So when someone
            tells you that ancient knowledge shared between humans for thousands
            of years is &quot;invalid&quot; because it hasn&apos;t been approved
            by the same institutions that poison your skies and water... ask
            yourself who that narrative serves.
          </p>
          <p>
            We&apos;re not saying we&apos;re right about everything. We&apos;re
            saying: what else do you have to lose? Your inflated groceries? Your
            $3,500 studio apartment? Your faith in a system that clearly
            doesn&apos;t give a fuck about you? Try something different.
          </p>
        </section>
      </div>
    </main>
  );
}
