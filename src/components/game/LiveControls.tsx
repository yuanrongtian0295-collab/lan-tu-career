import { Pause, Play } from 'lucide-react'

type LiveStatus = 'running' | 'paused' | 'finished'

export function LiveControls({ status, progress, clock, onPause, onContinue, onFinish }: { status: LiveStatus; progress: number; clock: string; onPause: () => void; onContinue: () => void; onFinish: () => void }) {
  const finished = status === 'finished'
  return <section className="live-controls-v6" aria-label="比赛控制">
    <h2>比赛控制</h2>
    <div className="match-control-buttons">
      <button type="button" className="is-pause" onClick={onPause} disabled={finished}><Pause fill="currentColor" /><span>暂停比赛</span></button>
      <button type="button" className="is-continue" onClick={onContinue} disabled={finished}><Play fill="currentColor" /><span>继续比赛</span></button>
    </div>
    <div className="live-progress-v6" role="progressbar" aria-label="本节进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
      <span>本节进度</span>
      <i><b style={{ width: `${progress}%` }} /></i>
      <strong>{clock} / 12:00</strong>
      <button type="button" onClick={onFinish} disabled={finished} aria-label="快速模拟至终场">终场</button>
    </div>
  </section>
}
