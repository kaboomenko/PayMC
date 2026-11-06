import { CodeBlock } from "@/components/ui/code-block";

/** "How to fix" checklist for an agent that lost connection. */
export function FixSteps({ serverName }: { serverName: string }) {
  const slug = serverName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "server";
  return (
    <ol className="space-y-4">
      <Step n={1} title="Проверьте, запущен ли сервер">
        Откройте панель хостинга или консоль машины. Частая причина — падение по OutOfMemory после рестарта: в конце логов будет
        <code className="mx-1 rounded-xs bg-white/[0.06] px-1 font-mono text-[11.5px] text-fg-2">java.lang.OutOfMemoryError</code>.
        <CodeBlock className="mt-2" title="Linux" code={`systemctl status ${slug}\njournalctl -u ${slug} -n 50`} />
      </Step>
      <Step n={2} title="Посмотрите логи плагина PayMC">
        Ищите строки <span className="font-mono text-[11.5px] text-fg-2">Connection lost</span> или{" "}
        <span className="font-mono text-[11.5px] text-fg-2">Invalid key</span> — второе значит, что ключ перевыпустили.
        <CodeBlock className="mt-2" title="Файл" code="plugins/PayMC/logs/latest.log" />
      </Step>
      <Step n={3} title="Выполните paymc status в консоли сервера">
        Агент сам переподключится и выполнит очередь. Если статус «disconnected» — выполните{" "}
        <span className="font-mono text-[11.5px] text-fg-2">paymc reconnect</span>.
        <CodeBlock
          className="mt-2"
          title="Консоль сервера"
          code={`> paymc status\n# PayMC agent 2.4.1 · connected · 18 ms · queue 0`}
        />
      </Step>
    </ol>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[22px_minmax(0,1fr)] gap-x-3">
      <span className="mt-px flex size-[22px] items-center justify-center rounded-full border border-line-strong font-mono text-[11px] text-fg-2">{n}</span>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-fg">{title}</p>
        <div className="mt-1 text-[12.5px] leading-relaxed text-fg-3">{children}</div>
      </div>
    </li>
  );
}
