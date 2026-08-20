const STEPS = ['选题', '大纲', '写作', '收尾']

export function Stepper({ current }: { current: number }) {
  return (
    <div className="stepper">
      {STEPS.map((label, i) => (
        <span key={label} className={`step ${i === current ? 'active' : i < current ? 'done' : ''}`}>
          {label}
        </span>
      ))}
    </div>
  )
}
