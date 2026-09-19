import { classifyRisk } from '../utils/riskClassification'

export default function TierBadge({ tier, probability }) {
  const effectiveTier = (typeof probability === 'number' && !isNaN(probability))
    ? classifyRisk(probability)
    : (tier || 'LOW')

  return (
    <span className={`tier-badge tier-${effectiveTier}`}>
      <span className={`tier-dot tier-dot-${effectiveTier}`} />
      <span>{effectiveTier}</span>
      {typeof probability === 'number' && (
        <span className="mono" style={{ opacity: 0.9, marginLeft: 2, fontSize: '12px' }}>
          · {(probability > 1.0 ? probability : probability * 100).toFixed(0)}%
        </span>
      )}
    </span>
  )
}
