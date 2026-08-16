import { useMemo, useState } from "react";
import affiliationsPayload from "@capture/api/affiliations.json";
import gossPayload from "@capture/api/star-systems/GOSS.json";
import objects from "@capture/index/celestial-objects.json";
import manifest from "@capture/index/manifest.json";
import systems from "@capture/index/systems.json";
import { zh } from "@/i18n/zh";
import type { AffiliationRow, ObjectIndexRow, SystemIndexRow } from "@/data/types";

const systemRows = systems as SystemIndexRow[];
const objectRows = objects as ObjectIndexRow[];
const affiliationRows = affiliationsPayload.data.resultset as AffiliationRow[];

const typeLabel: Record<string, string> = zh.types;

function labelType(code: string) {
  return typeLabel[code] ?? code;
}

export function StudyHome() {
  const [query, setQuery] = useState("GOSS");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return systemRows;
    return systemRows.filter(
      (s) => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q),
    );
  }, [query]);

  const goss = gossPayload.data.resultset[0];
  const gossObjects = objectRows.filter((o) => o.system === "GOSS");
  const typeCounts = objectRows.reduce<Record<string, number>>((acc, row) => {
    acc[row.type] = (acc[row.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="page">
      <header className="top">
        <div>
          <p className="kicker">{zh.study.heroKicker}</p>
          <h1>{zh.study.heroTitle}</h1>
          <p className="lead">{zh.study.heroLead}</p>
        </div>
        <p className="phase">{zh.meta.phase}</p>
      </header>

      <section className="grid">
        <article className="panel">
          <h2>{zh.study.deployTitle}</h2>
          <p>{zh.study.deployBody}</p>
          <ul className="facts">
            <li>预览：Vercel（本环境可登录账号 xiaoqianran）</li>
            <li>GitHub Pages：仓库暂无写权限，工作流只做构建检查</li>
            <li>Token 不进仓库，不进 Actions 明文</li>
          </ul>
        </article>

        <article className="panel">
          <h2>{zh.study.captureTitle}</h2>
          <ul className="facts">
            <li>对照版本 {manifest.appVersionHint}</li>
            <li>{systemRows.length} 个星系 · {objectRows.length} 个天体</li>
            <li>{manifest.files.length} 个 JSON · 错误 {manifest.errors.length}</li>
            <li>抓取时间 {new Date(manifest.capturedAt).toLocaleString("zh-CN")}</li>
          </ul>
          <div className="chips">
            {Object.entries(typeCounts).map(([type, count]) => (
              <span key={type} className="chip">
                {labelType(type)} {count}
              </span>
            ))}
          </div>
        </article>

        <article className="panel">
          <h2>{zh.study.i18nTitle}</h2>
          <p>
            <strong>{zh.study.i18nKeep}：</strong>
            ARK、GOSS、Cassel、UEE、Nick Croshaw、Tayac
          </p>
          <p>
            <strong>{zh.study.i18nTranslate}：</strong>
            {zh.hud.search} / {zh.hud.bookmarks} / {zh.hud.routes} / {zh.hud.display} ·{" "}
            {zh.intro.acknowledge} · {zh.bookmarks.empty}
          </p>
        </article>
      </section>

      <section className="panel wide">
        <div className="row">
          <h2>{zh.study.gossTitle}</h2>
          <a
            href="https://robertsspaceindustries.com/en/starmap/bookmarks?location=GOSS&camera=10,102.98,0.002,0,0"
            target="_blank"
            rel="noreferrer"
          >
            {zh.study.gossUrl}
          </a>
        </div>
        <p>
          {goss.name} <code>{goss.code}</code> · {labelType(goss.type)} · 阵营{" "}
          {goss.affiliation.map((a) => a.name).join(", ")}
        </p>
        <div className="chips">
          {gossObjects.map((obj) => (
            <span key={obj.code} className="chip">
              {labelType(obj.type)} {obj.name || obj.designation || obj.code}
            </span>
          ))}
        </div>
      </section>

      <section className="panel wide">
        <div className="row">
          <h2>{zh.study.systemsTitle}</h2>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={zh.study.filterPlaceholder}
          />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{zh.search.name}</th>
                <th>Code</th>
                <th>{zh.search.type}</th>
                <th>{zh.disc.affiliation}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sys) => (
                <tr key={sys.code}>
                  <td>{sys.name}</td>
                  <td>
                    <code>{sys.code}</code>
                  </td>
                  <td>{labelType(sys.type)}</td>
                  <td>
                    {sys.affiliation.map((code) => {
                      const aff = affiliationRows.find((a) => a.code === code);
                      return (
                        <span
                          key={code}
                          className="aff"
                          style={{ color: aff?.color ?? "var(--cyan)" }}
                        >
                          {aff?.name ?? code}
                        </span>
                      );
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel wide">
        <h2>{zh.study.nextTitle}</h2>
        <ol>
          {zh.study.nextItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
        <p className="disclaimer">{zh.meta.disclaimer}</p>
      </section>
    </div>
  );
}
