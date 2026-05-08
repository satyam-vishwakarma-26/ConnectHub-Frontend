import { Link } from 'react-router-dom'
import { Zap, Shield, Image as ImageIcon, ArrowRight, CheckCircle2, Star, Layers, Cpu } from 'lucide-react'
import LogoMark from '../components/ui/LogoMark'
import { useAuthStore } from '../context/authStore'
import { useEffect, useState } from 'react'

export default function LandingPage() {
  const { isAuthenticated } = useAuthStore()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#000000] text-white font-sans selection:bg-[#fff] selection:text-black">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        <div className="absolute top-[-10%] left-[20%] w-[60%] h-[50%] rounded-full opacity-30 blur-[120px]"
             style={{ background: 'radial-gradient(circle, rgba(86,182,198,0.8) 0%, rgba(23,12,121,0.4) 100%)' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[120px]"
             style={{ background: 'radial-gradient(circle, rgba(138,203,208,0.6) 0%, rgba(0,0,0,0) 100%)' }} />
      </div>
      
      {/* Navbar */}
      <nav className={`fixed w-full top-0 z-50 border-b transition-all duration-300 ${scrolled ? 'border-[#ffffff1a] bg-[#000000cc] backdrop-blur-xl py-4' : 'border-transparent bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 rounded-[12px] flex items-center justify-center border border-[#ffffff2a] bg-black/50 shadow-[0_0_20px_rgba(86,182,198,0.2)] transition-transform group-hover:scale-105 duration-300 relative overflow-hidden">
              <div className="absolute inset-0 opacity-50 bg-gradient-to-br from-[var(--sea)] to-[var(--brand)]" />
              <LogoMark size={20} className="relative z-10 text-white" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight transition-colors duration-300"
              style={{ fontFamily: 'Outfit, sans-serif' }}>
              ConnectHub
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 font-medium text-sm text-[#888888]">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
            <a href="#developers" className="hover:text-white transition-colors">Developers</a>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated() ? (
              <Link to="/chat" className="h-10 px-5 flex items-center justify-center rounded-full bg-white text-black font-semibold text-sm hover:scale-105 transition-transform">
                Open App
              </Link>
            ) : (
              <>
                <Link to="/login" className="hidden md:block text-sm font-semibold text-[#888] hover:text-white transition-colors">
                  Log in
                </Link>
                <Link to="/register" className="h-10 px-5 flex items-center justify-center rounded-full bg-white text-black font-semibold text-sm hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 pt-48 pb-32 px-6 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8 border border-[#ffffff1a] bg-[#ffffff05] backdrop-blur-md hover:bg-[#ffffff0a] transition-colors cursor-pointer">
          <Star size={14} className="text-[var(--sea)] fill-[var(--sea)]" />
          <span className="text-xs font-semibold tracking-wide text-[#aaaaaa]">Introducing ConnectHub 1.0</span>
          <ArrowRight size={14} className="text-[#888]" />
        </div>

        <h1 className="text-6xl md:text-8xl font-black max-w-5xl tracking-tighter leading-[1.0] mb-8"
            style={{ fontFamily: 'Outfit, sans-serif' }}>
          Real-time chat, <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-400 to-gray-600">
            engineered for speed.
          </span>
        </h1>

        <p className="text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed text-[#888888]">
          Built on Spring Boot and WebSockets. ConnectHub delivers sub-50ms message latency, rich media sharing, and secure rooms for modern teams.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
          <Link to={isAuthenticated() ? "/chat" : "/register"} 
                className="h-14 px-8 flex items-center justify-center rounded-full bg-white text-black font-bold text-lg hover:scale-105 transition-transform group gap-2 shadow-[0_0_30px_rgba(255,255,255,0.15)]">
            {isAuthenticated() ? "Go to Workspace" : "Start Building Free"}
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </Link>
          <a href="#features"
             className="h-14 px-8 flex items-center justify-center rounded-full font-semibold text-lg border border-[#ffffff2a] bg-[#ffffff05] hover:bg-[#ffffff0a] transition-all text-white">
            Explore Platform
          </a>
        </div>

        {/* Ultra-Premium App Mockup */}
        <div className="mt-32 w-full max-w-[1200px] relative animate-slide-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
          <div className="absolute -inset-1 bg-gradient-to-r from-[var(--sea)] via-purple-500 to-[var(--brand)] rounded-[32px] opacity-20 blur-2xl" />
          
          <div className="rounded-[32px] border border-[#ffffff1a] bg-[#000000] p-3 overflow-hidden relative shadow-[0_0_100px_rgba(0,0,0,0.8)] backdrop-blur-xl">
            {/* Top Bar */}
            <div className="flex items-center px-4 pb-3 pt-1 border-b border-[#ffffff1a] mb-3">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-[#111111] border border-[#ffffff1a] text-xs font-medium text-[#888]">
                  <Shield size={12} className="text-[#444]" /> app.connecthub.io
                </div>
              </div>
            </div>

            {/* Mockup Body */}
            <div className="flex h-[600px] gap-3">
              {/* Sidebar */}
              <div className="hidden md:flex flex-col w-72 rounded-[20px] bg-[#0a0a0a] border border-[#ffffff0a] p-4">
                <div className="flex items-center gap-3 mb-8 px-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-800 to-black border border-[#ffffff1a] flex items-center justify-center">
                    <LogoMark size={16} className="text-white" />
                  </div>
                  <div className="font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>Acme Corp</div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#555] mb-3 ml-2">Channels</div>
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#ffffff0a] border border-[#ffffff0a] cursor-pointer">
                    <span className="text-[#fff] opacity-50">#</span>
                    <span className="font-medium text-sm text-white flex-1">engineering</span>
                    <div className="w-2 h-2 rounded-full bg-[var(--sea)] shadow-[0_0_10px_var(--sea)]" />
                  </div>
                  <div className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-[#ffffff05]">
                    <span className="text-[#fff] opacity-30">#</span>
                    <span className="font-medium text-sm text-[#888]">product-design</span>
                  </div>
                  <div className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-[#ffffff05]">
                    <span className="text-[#fff] opacity-30">#</span>
                    <span className="font-medium text-sm text-[#888]">general</span>
                  </div>
                </div>
              </div>

              {/* Main Chat */}
              <div className="flex-1 rounded-[20px] bg-[#0a0a0a] border border-[#ffffff0a] flex flex-col relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02]" />
                
                <div className="flex items-center justify-between p-6 border-b border-[#ffffff0a] relative z-10">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2"># engineering</h2>
                    <p className="text-sm text-[#666]">System architecture and sprint planning</p>
                  </div>
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full border-2 border-[#0a0a0a] bg-gradient-to-br from-indigo-500 to-purple-500" />
                    <div className="w-8 h-8 rounded-full border-2 border-[#0a0a0a] bg-gradient-to-br from-emerald-500 to-teal-500" />
                    <div className="w-8 h-8 rounded-full border-2 border-[#0a0a0a] bg-gradient-to-br from-rose-500 to-red-500" />
                  </div>
                </div>

                <div className="flex-1 p-6 space-y-6 overflow-hidden relative z-10">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 shrink-0" />
                    <div>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-semibold text-white text-sm">David Kim</span>
                        <span className="text-[11px] text-[#555]">10:42 AM</span>
                      </div>
                      <div className="px-4 py-3 rounded-2xl rounded-tl-none bg-[#ffffff0a] text-[#ddd] text-sm max-w-md border border-[#ffffff05]">
                        The new media upload service is incredibly fast. Getting &lt;100ms response times globally.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 flex-row-reverse">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-black shrink-0 flex items-center justify-center text-xs font-bold border border-[#ffffff2a]">
                      Me
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="flex items-baseline gap-2 mb-1 flex-row-reverse">
                        <span className="font-semibold text-white text-sm">You</span>
                        <span className="text-[11px] text-[#555]">10:45 AM</span>
                      </div>
                      <div className="px-4 py-3 rounded-2xl rounded-tr-none text-white text-sm max-w-md shadow-lg" 
                           style={{ background: 'linear-gradient(135deg, rgba(86,182,198,0.2), rgba(23,12,121,0.4))', border: '1px solid rgba(86,182,198,0.3)' }}>
                        That's perfect. The WebSockets are handling the load effortlessly too.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 relative z-10">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[#000] border border-[#ffffff1a]">
                    <ImageIcon size={20} className="text-[#555]" />
                    <div className="flex-1 text-sm text-[#555]">Message #engineering...</div>
                    <div className="w-8 h-8 rounded-md bg-white text-black flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors">
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Feature Bento Grid (Dark) */}
      <section id="features" className="py-32 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="mb-20 text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Built for extreme <br className="hidden md:block"/>
              <span className="text-[#888]">performance & scale.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 rounded-[32px] p-10 bg-[#050505] border border-[#ffffff1a] relative overflow-hidden group hover:border-[#ffffff3a] transition-colors">
              <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--sea)] opacity-0 group-hover:opacity-10 blur-[100px] transition-opacity duration-700 rounded-full" />
              <Zap size={32} className="text-white mb-6 relative z-10" />
              <h3 className="text-2xl font-bold text-white mb-3 relative z-10" style={{ fontFamily: 'Outfit, sans-serif' }}>Sub-50ms Realtime Engine</h3>
              <p className="text-[#888] max-w-md leading-relaxed relative z-10">
                ConnectHub utilizes STOMP over WebSockets backed by Spring Boot and Redis Pub/Sub, ensuring messages are delivered instantly regardless of scale.
              </p>
            </div>

            <div className="rounded-[32px] p-8 bg-[#050505] border border-[#ffffff1a] group hover:border-[#ffffff3a] transition-colors">
              <Shield size={28} className="text-white mb-5" />
              <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>Enterprise Security</h3>
              <p className="text-[#888] text-sm leading-relaxed">
                Stateless JWT authentication, fine-grained room roles, and secure AWS S3 pre-signed URLs for media.
              </p>
            </div>

            <div className="rounded-[32px] p-8 bg-[#050505] border border-[#ffffff1a] group hover:border-[#ffffff3a] transition-colors">
              <Layers size={28} className="text-white mb-5" />
              <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>Microservices</h3>
              <p className="text-[#888] text-sm leading-relaxed">
                A highly decoupled backend architecture splitting auth, messages, rooms, presence, and media cleanly.
              </p>
            </div>

            <div className="md:col-span-2 rounded-[32px] p-10 bg-[#050505] border border-[#ffffff1a] flex flex-col justify-end min-h-[300px] relative overflow-hidden group hover:border-[#ffffff3a] transition-colors">
              <div className="absolute bottom-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]" />
              <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[var(--brand)] opacity-0 group-hover:opacity-20 blur-[80px] transition-opacity duration-700 rounded-full" />
              <Cpu size={32} className="text-white mb-6 relative z-10" />
              <h3 className="text-2xl font-bold text-white mb-3 relative z-10" style={{ fontFamily: 'Outfit, sans-serif' }}>Developer First</h3>
              <p className="text-[#888] max-w-md leading-relaxed relative z-10">
                Built with modern standards. Easily extensible, thoroughly documented APIs, and an entirely decoupled React Vite frontend.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Global Scale / Stats */}
      <section className="py-32 px-6 border-y border-[#ffffff1a] relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[var(--sea)] opacity-5 blur-[150px] rounded-[100%]" />
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold mb-16" style={{ fontFamily: 'Outfit, sans-serif' }}>Engineered for reliability.</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="flex flex-col items-center">
              <div className="text-4xl md:text-6xl font-black text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>99.99%</div>
              <div className="text-sm font-semibold text-[#666] tracking-widest uppercase">Uptime SLA</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-4xl md:text-6xl font-black text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>&lt;50ms</div>
              <div className="text-sm font-semibold text-[#666] tracking-widest uppercase">Global Latency</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-4xl md:text-6xl font-black text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>0</div>
              <div className="text-sm font-semibold text-[#666] tracking-widest uppercase">Data Breaches</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-4xl md:text-6xl font-black text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>24/7</div>
              <div className="text-sm font-semibold text-[#666] tracking-widest uppercase">Connectivity</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pre-Footer CTA */}
      <footer className="pt-32 pb-12 px-6 relative overflow-hidden bg-black text-center border-t border-[#ffffff1a]">
        <div className="absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-[60%] h-[50%] rounded-full opacity-20 blur-[120px]"
             style={{ background: 'radial-gradient(circle, rgba(86,182,198,1) 0%, rgba(23,12,121,1) 100%)' }} />

        <div className="max-w-3xl mx-auto relative z-10 mb-32">
          <LogoMark size={48} className="mx-auto text-white mb-8 opacity-80" />
          <h2 className="text-5xl md:text-7xl font-bold mb-8 tracking-tighter" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Start building your community.
          </h2>
          <Link to="/register" className="h-14 px-10 inline-flex items-center justify-center rounded-full bg-white text-black font-bold text-lg hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.2)]">
            Create an Account
          </Link>
        </div>

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between pt-8 border-t border-[#ffffff1a] text-[#666] text-sm font-medium relative z-10">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <LogoMark size={16} />
            <span>ConnectHub © {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Documentation</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
