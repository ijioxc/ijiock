function ProgressBar({ value, max = 100, color }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className="prog-track">
      <div className="prog-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

function MacdBar({ value }) {
  const abs = Math.min(Math.abs(value || 0), 5)
  const pct = (abs / 5) * 50
  const bull = value >= 0
  return (
    <div className="macd-track">
      <div className="macd-mid" />
      <div className="macd-bar" style={{
        width: `${pct}%`,
        left: bull ? '50%' : `calc(50% - ${pct}%)`,
        background: bull ? 'var(--up)' : 'var(--dn)',
      }} />
    </div>
  )
}

function RsiGauge({ value }) {
  const v = parseFloat(value) || 50
  const angle = -135 + (v / 100) * 270
  const zone = v >= 70 ? 'var(--dn)' : v <= 30 ? 'var(--up)' : 'var(--accent)'
  return (
    <div className="rsi-gauge-wrap">
      <svg viewBox="0 0 80 48" className="rsi-gauge-svg">
        {/* track arc */}
        <path d="M 8 44 A 34 34 0 1 1 72 44" fill="none" stroke="var(--border-md)" strokeWidth="5" strokeLinecap="round" />
        {/* oversold zone */}
        <path d="M 8 44 A 34 34 0 0 1 22 17" fill="none" stroke="rgba(38,166,154,.4)" strokeWidth="5" strokeLinecap="round" />
        {/* overbought zone */}
        <path d="M 58 17 A 34 34 0 0 1 72 44" fill="none" stroke="rgba(239,83,80,.4)" strokeWidth="5" strokeLinecap="round" />
        {/* needle */}
        <line
          x1="40" y1="44"
          x2={40 + 26 * Math.cos((angle - 90) * Math.PI / 180)}
          y2={44 + 26 * Math.sin((angle - 90) * Math.PI / 180)}
          stroke={zone} strokeWidth="2" strokeLinecap="round"
        />
        <circle cx="40" cy="44" r="3" fill={zone} />
        <text x="40" y="38" textAnchor="middle" fontSize="10" fontWeight="800" fill={zone}>{value}</text>
      </svg>
      <div className="rsi-zone-labels">
        <span style={{ color: 'var(--up)', fontSize: 8 }}>30</span>
        <span style={{ color: 'var(--dn)', fontSize: 8 }}>70</span>
      </div>
    </div>
  )
}

function SigCard({ label, sig, children }) {
  const isBull = /多|金叉|支撐|上升|偏強|超賣/.test(sig)
  const isBear = /空|死叉|壓力|下降|偏弱|超買/.test(sig)
  const cls = isBull ? 'bull' : isBear ? 'bear' : 'neutral'
  return (
    <div className={`sig-card ${cls}`}>
      <div className="sig-top">
        <div className={`sig-geo ${cls}`}>
          {isBull ? '▲' : isBear ? '▼' : '─'}
        </div>
        <div className="sig-body">
          <div className="tech-label">{label}</div>
          <div className={`tech-sig ${isBull ? 'up' : isBear ? 'dn' : ''}`}>{sig}</div>
        </div>
      </div>
      <div className="sig-bars">{children}</div>
    </div>
  )
}

function CandlePatternCard({ pattern }) {
  if (!pattern) return null
  const isBull = pattern.bull === true
  const isBear = pattern.bull === false
  const cls = isBull ? 'bull' : isBear ? 'bear' : 'neutral'
  return (
    <div className={`sig-card ${cls}`}>
      <div className="sig-top">
        <div className={`sig-geo ${cls}`} style={{ fontSize: 15 }}>
          {isBull ? '🕯' : isBear ? '🕯' : '🕯'}
        </div>
        <div className="sig-body">
          <div className="tech-label">K 線形態</div>
          <div className={`tech-sig ${isBull ? 'up' : isBear ? 'dn' : ''}`} style={{ fontSize: 10 }}>{pattern.name}</div>
        </div>
      </div>
      <div className="sig-bars">
        <div style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.5 }}>{pattern.hint}</div>
      </div>
    </div>
  )
}

function AtrGauge({ atrPct }) {
  const v = parseFloat(atrPct) || 0
  const pct = Math.min(v / 5, 1) * 100
  const color = v > 3 ? 'var(--dn)' : v > 1.5 ? 'var(--warn)' : 'var(--up)'
  return (
    <div className="atr-gauge">
      <div className="atr-track">
        <div className="atr-fill" style={{ width: `${pct}%`, background: color }} />
        <div className="atr-zone-lo" />
        <div className="atr-zone-hi" />
      </div>
      <div className="atr-labels">
        <span>低</span><span>中</span><span>高</span>
      </div>
      <div className="atr-val mono" style={{ color }}>{atrPct}%</div>
    </div>
  )
}

function CompositeScore({ tech }) {
  const { kdSignal, macdSignal, maStatus, rsiSignal, trend, candlePattern } = tech
  let score = 0
  // KD (15 pts)
  if (kdSignal.includes('偏多') || kdSignal.includes('金叉')) score += 15
  else if (kdSignal.includes('偏空') || kdSignal.includes('死叉')) score -= 15
  // MACD (20 pts)
  if (macdSignal.includes('金叉')) score += 20
  else if (macdSignal.includes('死叉')) score -= 20
  // MA (15 pts)
  if (maStatus.includes('多頭')) score += 15
  else if (maStatus.includes('空頭')) score -= 15
  // RSI (10 pts)
  const rsiNum = parseFloat(tech.lastRsi) || 50
  if (rsiNum > 55 && rsiNum < 70) score += 10
  else if (rsiNum < 45 && rsiNum > 30) score -= 10
  else if (rsiNum >= 70) score -= 8
  else if (rsiNum <= 30) score += 5
  // Trend (10 pts)
  if (trend.includes('上升')) score += 10
  else score -= 10
  // Candle (8 pts)
  if (candlePattern?.bull === true) score += 8
  else if (candlePattern?.bull === false) score -= 8
  // PSAR (7 pts)
  if (tech.psarBull === true) score += 7
  else if (tech.psarBull === false) score -= 7
  // StochRSI (6 pts)
  const stK = parseFloat(tech.stochRsiK) || 50
  if (stK < 20) score += 6
  else if (stK > 80) score -= 6
  else if (stK > 50) score += 3
  else score -= 3
  // Williams %R (5 pts)
  const wr = parseFloat(tech.williamsR) || -50
  if (wr <= -80) score += 5
  else if (wr >= -20) score -= 5
  // ROC (4 pts)
  const roc = parseFloat(tech.roc10) || 0
  if (roc >= 3) score += 4
  else if (roc <= -3) score -= 4
  // RSI divergence (±10)
  if (tech.rsiDivergence?.bull === true) score += 10
  else if (tech.rsiDivergence?.bull === false) score -= 10

  const clamped = Math.max(-100, Math.min(100, score))
  const pct = ((clamped + 100) / 200) * 100
  const color = clamped > 30 ? 'var(--up)' : clamped < -30 ? 'var(--dn)' : 'var(--warn)'
  const label = clamped > 55 ? '強烈看多' : clamped > 20 ? '偏多' : clamped < -55 ? '強烈看空' : clamped < -20 ? '偏空' : '中性觀望'
  return (
    <div className="composite-score">
      <div className="cs-left">
        <div className="cs-label">綜合訊號</div>
        <div className="cs-value" style={{ color }}>{label}</div>
      </div>
      <div className="cs-bar-wrap">
        <div className="cs-bar-track">
          <div className="cs-bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, var(--dn) 0%, var(--warn) 50%, var(--up) 100%)` }} />
          <div className="cs-needle" style={{ left: `${pct}%` }} />
        </div>
        <div className="cs-ticks"><span>空</span><span>中</span><span>多</span></div>
      </div>
      <div className="cs-score" style={{ color }}>{clamped > 0 ? '+' : ''}{clamped}</div>
    </div>
  )
}

function MfiGauge({ value }) {
  const v = parseFloat(value) || 50
  const pct = (v / 100) * 100
  const zone = v >= 80 ? 'var(--dn)' : v <= 20 ? 'var(--up)' : v >= 60 ? 'rgba(249,115,22,.9)' : 'var(--accent)'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div className="prog-track">
        <div className="prog-fill" style={{ width: `${pct}%`, background: zone }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: 'var(--text-3)' }}>
        <span style={{ color: 'var(--up)' }}>超賣20</span>
        <span style={{ color: zone, fontWeight: 800 }}>{value}</span>
        <span style={{ color: 'var(--dn)' }}>超買80</span>
      </div>
    </div>
  )
}

function ObvCard({ obvTrend }) {
  if (!obvTrend) return null
  const configs = {
    'confirm-up':  { label: '量價齊升（看多）', cls: 'bull', icon: '▲', hint: '量能配合上漲，趨勢健康' },
    'confirm-dn':  { label: '量價齊跌（看空）', cls: 'bear', icon: '▼', hint: '量能配合下跌，賣壓沉重' },
    'diverge-up':  { label: '量能背離（看漲）', cls: 'bull', icon: '⬍', hint: '價跌量增，潛在反轉訊號' },
    'diverge-dn':  { label: '量能背離（看跌）', cls: 'bear', icon: '⬍', hint: '價漲量縮，上升動能不足' },
  }
  const cfg = configs[obvTrend]
  if (!cfg) return null
  return (
    <div className={`sig-card ${cfg.cls}`}>
      <div className="sig-top">
        <div className={`sig-geo ${cfg.cls}`}>{cfg.icon}</div>
        <div className="sig-body">
          <div className="tech-label">OBV 量能</div>
          <div className={`tech-sig ${cfg.cls === 'bull' ? 'up' : 'dn'}`}>{cfg.label}</div>
        </div>
      </div>
      <div className="sig-bars">
        <div style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.5 }}>{cfg.hint}</div>
      </div>
    </div>
  )
}

function StochRsiCard({ k, d, sig }) {
  if (k === null) return null
  const kv = parseFloat(k) || 0
  const dv = parseFloat(d) || 0
  const color = kv >= 80 ? 'var(--dn)' : kv <= 20 ? 'var(--up)' : kv > dv ? 'var(--up)' : 'var(--dn)'
  const isBull = /超賣|偏多/.test(sig)
  const isBear = /超買|偏空/.test(sig)
  const cls = isBull ? 'bull' : isBear ? 'bear' : 'neutral'
  return (
    <div className={`sig-card ${cls}`}>
      <div className="sig-top">
        <div className={`sig-geo ${cls}`}>{isBull ? '▲' : isBear ? '▼' : '─'}</div>
        <div className="sig-body">
          <div className="tech-label">Stoch RSI</div>
          <div className={`tech-sig ${isBull ? 'up' : isBear ? 'dn' : ''}`}>{sig}</div>
        </div>
      </div>
      <div className="sig-bars">
        <div className="bar-row">
          <span className="bar-lbl">%K</span>
          <ProgressBar value={kv} color={color} />
          <span className="bar-val mono" style={{ color }}>{k}</span>
        </div>
        <div className="bar-row">
          <span className="bar-lbl">%D</span>
          <ProgressBar value={dv} color="rgba(99,102,241,.7)" />
          <span className="bar-val mono">{d}</span>
        </div>
      </div>
    </div>
  )
}

function WilliamsRCard({ value, sig }) {
  if (value === null) return null
  const v = parseFloat(value) || -50
  const pct = ((v + 100) / 100) * 100
  const isBull = /超賣|偏多/.test(sig)
  const isBear = /超買|偏空/.test(sig)
  const cls = isBull ? 'bull' : isBear ? 'bear' : 'neutral'
  const color = v >= -20 ? 'var(--dn)' : v <= -80 ? 'var(--up)' : 'var(--accent)'
  return (
    <div className={`sig-card ${cls}`}>
      <div className="sig-top">
        <div className={`sig-geo ${cls}`}>{isBull ? '▲' : isBear ? '▼' : '─'}</div>
        <div className="sig-body">
          <div className="tech-label">Williams %R</div>
          <div className={`tech-sig ${isBull ? 'up' : isBear ? 'dn' : ''}`}>{sig}</div>
        </div>
      </div>
      <div className="sig-bars">
        <div className="bar-row">
          <span className="bar-lbl">%R</span>
          <ProgressBar value={pct} color={color} />
          <span className="bar-val mono" style={{ color }}>{value}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: 'var(--text-3)', marginTop: 2 }}>
          <span style={{ color: 'var(--up)' }}>超賣-80</span>
          <span style={{ color: 'var(--dn)' }}>超買-20</span>
        </div>
      </div>
    </div>
  )
}

const BB_PATTERN_META = {
  bull:    { icon: '▲', cls: 'bull', color: 'var(--up)' },
  bear:    { icon: '▼', cls: 'bear', color: 'var(--dn)' },
  squeeze: { icon: '⊙', cls: 'neutral', color: 'var(--warn)' },
  neutral: { icon: '═', cls: 'neutral', color: 'var(--accent)' },
}

function BbSqueezeCard({ bbWidth, sig, pattern }) {
  if (!bbWidth) return null
  const v = parseFloat(bbWidth) || 0
  const widthPct = Math.min(v / 25, 1) * 100
  const meta = BB_PATTERN_META[pattern] ?? BB_PATTERN_META.neutral
  // Position indicator: where in the band is price? encoded in sig
  const isBreakout = /突破上軌|跌破下軌/.test(sig)
  const isRiding   = /騎乘/.test(sig)
  const isSqueeze  = /收縮|等待/.test(sig)
  return (
    <div className={`sig-card ${meta.cls}`}>
      <div className="sig-top">
        <div className={`sig-geo ${meta.cls}`} style={{ fontSize: 13, fontWeight: 900 }}>{meta.icon}</div>
        <div className="sig-body">
          <div className="tech-label">布林通道 BB</div>
          <div className={`tech-sig`} style={{ color: meta.color, fontWeight: 800 }}>{sig}</div>
        </div>
      </div>
      <div className="sig-bars">
        <div className="bar-row">
          <span className="bar-lbl">帶寬</span>
          <div className="prog-track" style={{ position: 'relative' }}>
            <div className="prog-fill" style={{ width: `${widthPct}%`, background: meta.color }} />
            {/* Reference markers */}
            <div style={{ position: 'absolute', top: 0, left: '16%', width: 1, height: '100%', background: 'var(--warn)', opacity: .6 }} title="收縮線(4%)" />
            <div style={{ position: 'absolute', top: 0, left: '32%', width: 1, height: '100%', background: 'var(--text-3)', opacity: .5 }} title="窄帶線(8%)" />
          </div>
          <span className="bar-val mono" style={{ color: meta.color }}>{v.toFixed(1)}%</span>
        </div>
        {(isBreakout || isRiding || isSqueeze) && (
          <div style={{ fontSize: 9, color: meta.color, fontWeight: 700, paddingLeft: 2, opacity: .85 }}>
            {isBreakout && '⚡ 突破訊號，注意假突破風險'}
            {isRiding   && '🏄 趨勢強勁，跟隨但設好停損'}
            {isSqueeze  && '🔋 能量蓄積，突破方向決定多空'}
          </div>
        )}
      </div>
    </div>
  )
}

function PsarCard({ bull, sig }) {
  if (bull === null) return null
  const cls = bull ? 'bull' : 'bear'
  return (
    <div className={`sig-card ${cls}`}>
      <div className="sig-top">
        <div className={`sig-geo ${cls}`} style={{ fontSize: 13 }}>{bull ? '⬆' : '⬇'}</div>
        <div className="sig-body">
          <div className="tech-label">拋物線 SAR</div>
          <div className={`tech-sig ${bull ? 'up' : 'dn'}`}>{sig}</div>
        </div>
      </div>
    </div>
  )
}

function AdxCard({ adx, plusDI, minusDI, sig }) {
  if (!adx) return null
  const v = parseFloat(adx) || 0
  const pct = Math.min(v / 50, 1) * 100
  const isTrending = v >= 25
  const isBull = /偏多|強趨勢多/.test(sig)
  const isBear = /偏空|強趨勢空/.test(sig)
  const cls = isBull ? 'bull' : isBear ? 'bear' : 'neutral'
  const color = v >= 40 ? 'var(--accent)' : v >= 25 ? 'rgba(245,158,11,.9)' : 'var(--text-3)'
  return (
    <div className={`sig-card ${cls}`}>
      <div className="sig-top">
        <div className={`sig-geo ${cls}`} style={{ fontSize: 13 }}>{isTrending ? '⟳' : '≈'}</div>
        <div className="sig-body">
          <div className="tech-label">ADX 趨勢強度</div>
          <div className={`tech-sig ${isBull ? 'up' : isBear ? 'dn' : ''}`}>{sig}</div>
        </div>
      </div>
      <div className="sig-bars">
        <div className="bar-row">
          <span className="bar-lbl">ADX</span>
          <ProgressBar value={pct} color={color} />
          <span className="bar-val mono" style={{ color }}>{adx}</span>
        </div>
        <div className="bar-row" style={{ gap: 8, marginTop: 3 }}>
          <span className="bar-lbl up" style={{ fontSize: 8 }}>+DI</span>
          <span className="bar-val mono up">{plusDI}</span>
          <span className="bar-lbl dn" style={{ fontSize: 8 }}>-DI</span>
          <span className="bar-val mono dn">{minusDI}</span>
        </div>
      </div>
    </div>
  )
}

function RocCard({ roc10, roc21, sig }) {
  if (!roc10) return null
  const v10 = parseFloat(roc10) || 0
  const v21 = parseFloat(roc21) || 0
  const isBull = v10 > 0
  const cls = v10 >= 2 ? 'bull' : v10 <= -2 ? 'bear' : 'neutral'
  const color = v10 >= 5 ? 'var(--up)' : v10 <= -5 ? 'var(--dn)' : v10 > 0 ? 'rgba(38,166,154,.7)' : 'rgba(239,83,80,.7)'
  return (
    <div className={`sig-card ${cls}`}>
      <div className="sig-top">
        <div className={`sig-geo ${cls}`}>{isBull ? '▲' : '▼'}</div>
        <div className="sig-body">
          <div className="tech-label">動能 ROC</div>
          <div className={`tech-sig ${isBull ? 'up' : 'dn'}`}>{sig}</div>
        </div>
      </div>
      <div className="sig-bars">
        <div className="bar-row">
          <span className="bar-lbl" style={{ fontSize: 8 }}>10D</span>
          <span className="bar-val mono" style={{ color }}>{v10 >= 0 ? '+' : ''}{roc10}%</span>
        </div>
        <div className="bar-row">
          <span className="bar-lbl" style={{ fontSize: 8 }}>21D</span>
          <span className="bar-val mono" style={{ color: v21 >= 0 ? 'var(--up)' : 'var(--dn)' }}>{v21 >= 0 ? '+' : ''}{roc21}%</span>
        </div>
      </div>
    </div>
  )
}

function RsiDivergenceCard({ div }) {
  if (!div) return null
  const cls = div.bull ? 'bull' : 'bear'
  return (
    <div className={`sig-card ${cls}`} style={{ gridColumn: 'span 2' }}>
      <div className="sig-top">
        <div className={`sig-geo ${cls}`} style={{ fontSize: 16 }}>{div.bull ? '🔵' : '🔴'}</div>
        <div className="sig-body">
          <div className="tech-label">RSI 背離訊號</div>
          <div className={`tech-sig ${div.bull ? 'up' : 'dn'}`}>{div.desc}</div>
        </div>
      </div>
      <div className="sig-bars">
        <div style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.5 }}>
          {div.bull
            ? '價格創新低但 RSI 未同步，潛在多頭反轉訊號，建議搭配其他指標確認'
            : '價格創新高但 RSI 未同步，潛在空頭回落訊號，建議設定止損保護獲利'}
        </div>
      </div>
    </div>
  )
}

function CciCard({ cci, sig }) {
  if (cci === null) return null
  const v = parseFloat(cci) || 0
  const isBull = /超賣|偏強/.test(sig)
  const isBear = /超買|偏弱/.test(sig)
  const cls = isBull ? 'bull' : isBear ? 'bear' : 'neutral'
  const color = v > 100 ? 'var(--dn)' : v < -100 ? 'var(--up)' : v > 0 ? 'rgba(38,166,154,.8)' : 'rgba(239,83,80,.8)'
  const pct = Math.min(Math.max((v + 300) / 600 * 100, 0), 100)
  return (
    <div className={`sig-card ${cls}`}>
      <div className="sig-top">
        <div className={`sig-geo ${cls}`}>{isBull ? '▲' : isBear ? '▼' : '─'}</div>
        <div className="sig-body">
          <div className="tech-label">CCI(20) 順勢指標</div>
          <div className={`tech-sig ${isBull ? 'up' : isBear ? 'dn' : ''}`}>{sig}</div>
        </div>
      </div>
      <div className="sig-bars">
        <div className="bar-row">
          <span className="bar-lbl">CCI</span>
          <div className="cci-track">
            <div className="cci-zone-lo" />
            <div className="cci-zone-hi" />
            <div className="cci-needle" style={{ left: `${pct}%`, background: color }} />
          </div>
          <span className="bar-val mono" style={{ color }}>{v >= 0 ? '+' : ''}{cci}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7.5, color: 'var(--text-3)', marginTop: 2 }}>
          <span style={{ color: 'var(--up)' }}>-300</span>
          <span>-100</span>
          <span>0</span>
          <span>+100</span>
          <span style={{ color: 'var(--dn)' }}>+300</span>
        </div>
      </div>
    </div>
  )
}

function CmfCard({ cmf, sig }) {
  if (cmf === null) return null
  const v = parseFloat(cmf) || 0
  const isBull = /買盤|流入/.test(sig)
  const isBear = /賣壓|流出/.test(sig)
  const cls = isBull ? 'bull' : isBear ? 'bear' : 'neutral'
  const color = v > 0.1 ? 'var(--up)' : v < -0.1 ? 'var(--dn)' : 'var(--text-2)'
  const pct = Math.min(Math.max((v + 0.5) / 1.0 * 100, 0), 100)
  return (
    <div className={`sig-card ${cls}`}>
      <div className="sig-top">
        <div className={`sig-geo ${cls}`}>{isBull ? '▲' : isBear ? '▼' : '─'}</div>
        <div className="sig-body">
          <div className="tech-label">CMF(20) 柴金資金流</div>
          <div className={`tech-sig ${isBull ? 'up' : isBear ? 'dn' : ''}`}>{sig}</div>
        </div>
      </div>
      <div className="sig-bars">
        <div className="bar-row">
          <span className="bar-lbl">CMF</span>
          <div className="macd-track">
            <div className="macd-mid" />
            <div className="macd-bar" style={{
              width: `${Math.min(Math.abs(v) / 0.5, 1) * 50}%`,
              left: v >= 0 ? '50%' : `calc(50% - ${Math.min(Math.abs(v) / 0.5, 1) * 50}%)`,
              background: v >= 0 ? 'var(--up)' : 'var(--dn)',
            }} />
          </div>
          <span className="bar-val mono" style={{ color }}>{v >= 0 ? '+' : ''}{cmf}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7.5, color: 'var(--text-3)', marginTop: 2 }}>
          <span style={{ color: 'var(--dn)' }}>-0.25</span>
          <span>0</span>
          <span style={{ color: 'var(--up)' }}>+0.25</span>
        </div>
      </div>
    </div>
  )
}

function ElderRayCard({ bull, bear, sig }) {
  if (bull === null) return null
  const bv = parseFloat(bull) || 0
  const brv = parseFloat(bear) || 0
  const isBull = /強多|多頭/.test(sig)
  const isBear = /強空|空頭/.test(sig)
  const cls = isBull ? 'bull' : isBear ? 'bear' : 'neutral'
  const extreme = Math.max(Math.abs(bv), Math.abs(brv), 0.1)
  const bPct = Math.min(Math.abs(bv) / extreme, 1) * 50
  const brPct = Math.min(Math.abs(brv) / extreme, 1) * 50
  return (
    <div className={`sig-card ${cls}`}>
      <div className="sig-top">
        <div className={`sig-geo ${cls}`}>{isBull ? '▲' : isBear ? '▼' : '─'}</div>
        <div className="sig-body">
          <div className="tech-label">Elder Ray 多空力道</div>
          <div className={`tech-sig ${isBull ? 'up' : isBear ? 'dn' : ''}`}>{sig}</div>
        </div>
      </div>
      <div className="sig-bars">
        <div className="bar-row">
          <span className="bar-lbl" style={{ color: 'var(--up)', fontSize: 8 }}>牛力</span>
          <div className="macd-track">
            <div className="macd-mid" />
            <div className="macd-bar" style={{
              width: `${bPct}%`,
              left: bv >= 0 ? '50%' : `calc(50% - ${bPct}%)`,
              background: bv >= 0 ? 'var(--up)' : 'var(--dn)',
            }} />
          </div>
          <span className="bar-val mono" style={{ color: bv >= 0 ? 'var(--up)' : 'var(--dn)' }}>{bv >= 0 ? '+' : ''}{bull}</span>
        </div>
        <div className="bar-row">
          <span className="bar-lbl" style={{ color: 'var(--dn)', fontSize: 8 }}>熊力</span>
          <div className="macd-track">
            <div className="macd-mid" />
            <div className="macd-bar" style={{
              width: `${brPct}%`,
              left: brv >= 0 ? '50%' : `calc(50% - ${brPct}%)`,
              background: brv >= 0 ? 'var(--up)' : 'var(--dn)',
            }} />
          </div>
          <span className="bar-val mono" style={{ color: brv >= 0 ? 'var(--up)' : 'var(--dn)' }}>{brv >= 0 ? '+' : ''}{bear}</span>
        </div>
      </div>
    </div>
  )
}

export default function TechSignal({ tech }) {
  if (!tech) return null
  const { trend, kdSignal, macdSignal, maStatus, lastK, lastD, lastMacd, lastSignal, ma5, ma20, ma60, ma120, ma240, lastRsi, rsiSignal, candlePattern, atr, atrPct, volatility, lastMfi, mfiSignal, obvTrend, stochRsiK, stochRsiD, stochRsiSignal, williamsR, wrSignal, bbWidth, bbSqueezeSignal, bbPattern, psarBull, psarSignal, rsiDivergence, adx, plusDI, minusDI, adxSignal, roc10, roc21, rocSignal, weeklyRsi, monthlyRsi, weeklyMacd, cci20, cciSignal, cmf20, cmfSignal, bullPower, bearPower, elderSignal } = tech
  const isBull = trend.includes('上升')

  const bbMeta = BB_PATTERN_META[bbPattern] ?? BB_PATTERN_META.neutral
  const bbV = parseFloat(bbWidth) || 0
  const bbWidthPct = Math.min(bbV / 25, 1) * 100
  const bbHint = /突破上軌|跌破下軌/.test(bbSqueezeSignal) ? '⚡ 突破訊號，注意假突破風險'
    : /騎乘/.test(bbSqueezeSignal) ? '🏄 趨勢強勁，跟隨但設好停損'
    : /收縮|等待/.test(bbSqueezeSignal) ? '🔋 能量蓄積中，突破方向決定多空'
    : ''

  return (
    <div className="tech-panel">
      <div className="tech-top-row">
        <div className={`trend-badge ${isBull ? 'up-bg up' : 'dn-bg dn'}`}>
          <span className="trend-arrow">{isBull ? '↑' : '↓'}</span>
          {trend}
        </div>
        <CompositeScore tech={tech} />
      </div>

      {bbWidth && (
        <div className={`bb-banner bb-banner-${bbPattern ?? 'neutral'}`}>
          <div className="bb-banner-icon">{bbMeta.icon}</div>
          <div className="bb-banner-body">
            <div className="bb-banner-title">布林通道訊號</div>
            <div className="bb-banner-sig">{bbSqueezeSignal}</div>
            {bbHint && <div className="bb-banner-hint">{bbHint}</div>}
          </div>
          <div className="bb-banner-right">
            <div className="bb-banner-width-label">帶寬</div>
            <div className="bb-banner-width-val" style={{ color: bbMeta.color }}>{bbV.toFixed(1)}%</div>
            <div className="bb-bw-track">
              <div className="bb-bw-fill" style={{ width: `${bbWidthPct}%`, background: bbMeta.color }} />
              <div className="bb-bw-mark" style={{ left: '16%' }} title="收縮(4%)" />
              <div className="bb-bw-mark" style={{ left: '32%', opacity: .4 }} title="窄帶(8%)" />
            </div>
          </div>
        </div>
      )}

      <div className="tech-grid">
        <SigCard label="KD 隨機指標" sig={kdSignal}>
          <div className="bar-row">
            <span className="bar-lbl">K</span>
            <ProgressBar value={lastK} color="var(--accent)" />
            <span className="bar-val mono">{lastK}</span>
          </div>
          <div className="bar-row">
            <span className="bar-lbl">D</span>
            <ProgressBar value={lastD} color="var(--bb-lower)" />
            <span className="bar-val mono">{lastD}</span>
          </div>
        </SigCard>

        <SigCard label="MACD" sig={macdSignal}>
          <div className="bar-row">
            <span className="bar-lbl">DIF</span>
            <MacdBar value={lastMacd} />
            <span className="bar-val mono">{lastMacd}</span>
          </div>
          <div className="bar-row">
            <span className="bar-lbl">DEA</span>
            <MacdBar value={lastSignal} />
            <span className="bar-val mono">{lastSignal}</span>
          </div>
        </SigCard>

        <SigCard label="均線 MA" sig={maStatus}>
          <div className="bar-row">
            <span className="bar-lbl">MA5</span>
            <span className="bar-val mono up">{ma5 ?? '-'}</span>
          </div>
          <div className="bar-row">
            <span className="bar-lbl">MA20</span>
            <span className="bar-val mono">{ma20 ?? '-'}</span>
          </div>
          {ma60 && (
            <div className="bar-row">
              <span className="bar-lbl">MA60</span>
              <span className="bar-val mono dn">{ma60}</span>
            </div>
          )}
          {ma120 && (
            <div className="bar-row">
              <span className="bar-lbl" style={{ color: 'rgba(139,92,246,.8)' }}>MA120</span>
              <span className="bar-val mono">{ma120}</span>
            </div>
          )}
          {ma240 && (
            <div className="bar-row">
              <span className="bar-lbl" style={{ color: 'rgba(236,72,153,.8)' }}>MA240</span>
              <span className="bar-val mono">{ma240}</span>
            </div>
          )}
        </SigCard>

        {lastRsi !== null && (
          <SigCard label="RSI 14" sig={rsiSignal}>
            <RsiGauge value={lastRsi} />
          </SigCard>
        )}
        <CandlePatternCard pattern={candlePattern} />
        {atrPct && (
          <SigCard label="ATR 波動率" sig={volatility}>
            <AtrGauge atrPct={atrPct} />
            <div className="bar-row" style={{ marginTop: 4 }}>
              <span className="bar-lbl">ATR</span>
              <span className="bar-val mono">{atr}</span>
            </div>
          </SigCard>
        )}
        {lastMfi !== null && (
          <SigCard label="MFI 資金流向" sig={mfiSignal}>
            <MfiGauge value={lastMfi} />
          </SigCard>
        )}
        <ObvCard obvTrend={obvTrend} />
        <StochRsiCard k={stochRsiK} d={stochRsiD} sig={stochRsiSignal} />
        <WilliamsRCard value={williamsR} sig={wrSignal} />
        <BbSqueezeCard bbWidth={bbWidth} sig={bbSqueezeSignal} pattern={bbPattern} />
        <PsarCard bull={psarBull} sig={psarSignal} />
        <AdxCard adx={adx} plusDI={plusDI} minusDI={minusDI} sig={adxSignal} />
        <RocCard roc10={roc10} roc21={roc21} sig={rocSignal} />
        <RsiDivergenceCard div={rsiDivergence} />
        <CciCard cci={cci20} sig={cciSignal} />
        <CmfCard cmf={cmf20} sig={cmfSignal} />
        <ElderRayCard bull={bullPower} bear={bearPower} sig={elderSignal} />
      </div>

      {(weeklyRsi || monthlyRsi) && (
        <div className="mtf-panel">
          <div className="mtf-title">多週期分析</div>
          <div className="mtf-grid">
            {[
              { label: '日線', rsi: lastRsi, macd: parseFloat(lastMacd) > parseFloat(lastSignal) ? '多' : '空' },
              { label: '週線', rsi: weeklyRsi, macd: weeklyMacd },
              { label: '月線', rsi: monthlyRsi, macd: null },
            ].filter(row => row.rsi).map(row => {
              const rv = parseFloat(row.rsi) || 50
              const rsiColor = rv >= 70 ? 'var(--dn)' : rv <= 30 ? 'var(--up)' : rv >= 55 ? 'rgba(38,166,154,.8)' : rv <= 45 ? 'rgba(239,83,80,.8)' : 'var(--text-2)'
              return (
                <div key={row.label} className="mtf-row">
                  <span className="mtf-label">{row.label}</span>
                  <span className="mtf-item">
                    <span className="mtf-k">RSI</span>
                    <span className="mtf-v mono" style={{ color: rsiColor }}>{row.rsi}</span>
                  </span>
                  {row.macd && (
                    <span className="mtf-item">
                      <span className="mtf-k">MACD</span>
                      <span className={`mtf-v ${row.macd === '多' ? 'up' : 'dn'}`}>{row.macd}</span>
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
