import type { Metadata } from "next";
import { getFulfilledOrder, type OrderFile } from "@/lib/orders";
import comingSoon from "../../coming-soon.module.css";
import styles from "./page.module.css";

/* ═══════════════════════════════════════════════════════════════════
   Downloads — tokenized delivery page for a paid digital order.
   Files are grouped by product; each row links to the streaming
   /api/download/[token] endpoint. Never indexed.
   ═══════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your Downloads",
  robots: { index: false, follow: false },
};

type Params = Promise<{ token: string }>;

const KIND_LABEL: Record<OrderFile["kind"], string> = {
  audio: "audio",
  text: "text",
  pdf: "pdf",
  video: "video",
  archive: "archive",
  image: "image",
  other: "file",
};

function humanSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function humanDuration(seconds: number | null): string | null {
  if (seconds === null || seconds <= 0) return null;
  const total = Math.round(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function readableDate(iso: string | null): string {
  if (!iso) return "your purchase window";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function DownloadPage({ params }: { params: Params }) {
  const { token } = await params;
  const fulfilled = await getFulfilledOrder(token);

  if (!fulfilled) {
    return (
      <main className={comingSoon.main}>
        <div className={comingSoon.content}>
          <h1 className={comingSoon.title}>
            inthe<span className={comingSoon.accent}>Gno</span>
          </h1>
          <p className={comingSoon.message}>
            this download link is invalid or has expired.
          </p>
          <a href="/contact" className={comingSoon.backLink}>
            contact us →
          </a>
        </div>
      </main>
    );
  }

  const { order, files } = fulfilled;

  // Group files by product title, preserving first-seen order.
  const groups: Array<{ title: string; files: OrderFile[] }> = [];
  const indexByTitle = new Map<string, number>();
  for (const file of files) {
    const title = file.productTitle || "your download";
    let idx = indexByTitle.get(title);
    if (idx === undefined) {
      idx = groups.length;
      indexByTitle.set(title, idx);
      groups.push({ title, files: [] });
    }
    groups[idx].files.push(file);
  }

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1>
          inthe<span className={styles.accent}>Gno</span> your downloads
        </h1>
        <p className={styles.subtitle}>thank you — these are yours to keep.</p>
      </header>

      {groups.length === 0 ? (
        <p className={styles.empty}>
          your order is confirmed — a receipt is on its way to your inbox.
          {fulfilled.files.length === 0
            ? " physical items ship soon."
            : " digital files are being prepared — refresh in a moment."}
        </p>
      ) : (
        <div className={styles.groups}>
          {groups.map((group) => (
            <section key={group.title} className={styles.group}>
              <h2 className={styles.groupTitle}>{group.title}</h2>
              <ul className={styles.fileList}>
                {group.files.map((file) => {
                  const duration = humanDuration(file.durationSeconds);
                  return (
                    <li key={file.assetId} className={styles.fileRow}>
                      <div className={styles.fileInfo}>
                        <span className={styles.kind}>
                          {KIND_LABEL[file.kind]}
                        </span>
                        <span className={styles.fileLabel}>{file.label}</span>
                        <span className={styles.fileMeta}>
                          {humanSize(file.sizeBytes)}
                          {duration ? ` · ${duration}` : ""}
                        </span>
                      </div>
                      <a
                        href={`/api/download/${token}?asset=${file.assetId}`}
                        className={styles.download}
                      >
                        download
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <p className={styles.footer}>
          links stay live until {readableDate(order.expires_at)} — download and
          keep forever.
        </p>
      )}
    </main>
  );
}
