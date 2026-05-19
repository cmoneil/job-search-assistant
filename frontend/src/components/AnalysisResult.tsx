import { Analysis } from "@/lib/api";

const verdictConfig = {
  apply: { label: "Apply", bg: "bg-green-100", text: "text-green-800", border: "border-green-200" },
  consider: { label: "Consider", bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-200" },
  skip: { label: "Skip", bg: "bg-red-100", text: "text-red-800", border: "border-red-200" },
};

const severityConfig = {
  critical: { dot: "bg-red-500", label: "Critical" },
  moderate: { dot: "bg-yellow-500", label: "Moderate" },
  minor: { dot: "bg-gray-400", label: "Minor" },
};

const severityOrder = { critical: 0, moderate: 1, minor: 2 };

export default function AnalysisResult({ analysis }: { analysis: Analysis }) {
  const { stack_match, experience_fit, gaps, verdict } = analysis;
  const vc = verdictConfig[verdict.recommendation];
  const sortedGaps = [...gaps].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Verdict header */}
      <div className={`rounded-lg border p-5 ${vc.bg} ${vc.border}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-semibold uppercase tracking-wide ${vc.text}`}>
            Recommendation
          </span>
          <span className={`text-lg font-bold ${vc.text}`}>{vc.label}</span>
        </div>
        <p className={`text-sm ${vc.text} mb-3`}>{verdict.summary}</p>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${vc.text}`}>Confidence</span>
          <div className="flex-1 bg-white/50 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${
                verdict.recommendation === "apply"
                  ? "bg-green-600"
                  : verdict.recommendation === "consider"
                  ? "bg-yellow-600"
                  : "bg-red-600"
              }`}
              style={{ width: `${verdict.confidence}%` }}
            />
          </div>
          <span className={`text-xs font-medium ${vc.text}`}>{verdict.confidence}%</span>
        </div>
        {verdict.key_selling_points.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1">
            {verdict.key_selling_points.map((pt, i) => (
              <li key={i} className={`text-sm ${vc.text} flex gap-2`}>
                <span>+</span>
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Stack match */}
      <div className="rounded-lg border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Stack Match</h3>
          <div className="flex items-center gap-2">
            <div className="w-24 bg-gray-100 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-blue-500"
                style={{ width: `${stack_match.score}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-700">{stack_match.score}/100</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs font-medium text-green-700 mb-1">Matched</p>
            {stack_match.matched_skills.length === 0 ? (
              <p className="text-gray-400">None</p>
            ) : (
              <ul className="flex flex-wrap gap-1">
                {stack_match.matched_skills.map((s) => (
                  <li key={s} className="bg-green-50 text-green-800 px-2 py-0.5 rounded text-xs">
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-red-700 mb-1">Missing</p>
            {stack_match.missing_skills.length === 0 ? (
              <p className="text-gray-400">None</p>
            ) : (
              <ul className="flex flex-wrap gap-1">
                {stack_match.missing_skills.map((s) => (
                  <li key={s} className="bg-red-50 text-red-800 px-2 py-0.5 rounded text-xs">
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-blue-700 mb-1">Bonus</p>
            {stack_match.bonus_skills.length === 0 ? (
              <p className="text-gray-400">None</p>
            ) : (
              <ul className="flex flex-wrap gap-1">
                {stack_match.bonus_skills.map((s) => (
                  <li key={s} className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded text-xs">
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Experience fit */}
      <div className="rounded-lg border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Experience Fit</h3>
        <div className="flex flex-wrap gap-3 mb-2">
          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded capitalize">
            {experience_fit.seniority_level}
          </span>
          <span
            className={`text-xs px-2 py-1 rounded capitalize font-medium ${
              experience_fit.fit_level === "strong"
                ? "bg-green-100 text-green-700"
                : experience_fit.fit_level === "moderate"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {experience_fit.fit_level} fit
          </span>
          {experience_fit.required_years !== null && (
            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
              {experience_fit.required_years}+ yrs required
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600">{experience_fit.notes}</p>
      </div>

      {/* Gaps */}
      {sortedGaps.length > 0 && (
        <div className="rounded-lg border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Gaps</h3>
          <ul className="flex flex-col gap-3">
            {sortedGaps.map((gap, i) => {
              const sc = severityConfig[gap.severity];
              return (
                <li key={i} className="flex gap-3">
                  <span
                    className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${sc.dot}`}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {gap.area}{" "}
                      <span className="text-xs font-normal text-gray-500">({sc.label})</span>
                    </p>
                    <p className="text-sm text-gray-600">{gap.description}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
