import './App.css'
import ASCIIText from '../@/components/ASCIIText'
import ColorBends from '../@/components/ColorBends'
import Antigravity from '../@/components/Antigravity'
import Ballpit from '../@/components/Ballpit'

function App() {
  return (
    <>
      <main className="rb-lab">
        <section className="rb-hero rb-card">
          <ColorBends
            className="rb-bg"
            colors={['#4f46e5', '#06b6d4', '#ec4899', '#f59e0b']}
            speed={0.3}
            rotation={20}
            noise={0.05}
            warpStrength={1.1}
          />
          <div className="rb-overlay">
            <h1>React Bits Playground</h1>
            <p>ASCII + Color Bends + Antigravity + Ballpit</p>
          </div>
        </section>

        <section className="rb-grid">
          <div className="rb-card rb-ascii">
            <ASCIIText text="ISAACOS" asciiFontSize={8} textFontSize={160} enableWaves />
          </div>
          <div className="rb-card rb-anti">
            <Antigravity count={220} particleSize={1.1} ringRadius={7} color="#8b5cf6" autoAnimate />
          </div>
        </section>

        <section className="rb-card rb-ballpit">
          <Ballpit
            count={140}
            gravity={0.7}
            friction={0.995}
            wallBounce={0.96}
            colors={[0x7c3aed, 0x2563eb, 0x06b6d4, 0xf43f5e]}
            followCursor
          />
          <div className="rb-label">move your cursor around</div>
        </section>
      </main>
      <div className="rb-crt-overlay" aria-hidden="true"></div>
      <div className="rb-grain-overlay" aria-hidden="true"></div>
    </>
  )
}

export default App
