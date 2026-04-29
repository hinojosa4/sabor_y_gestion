'use client'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  return (
    <main style={{background:'#f8f7f4',minHeight:'100vh',fontFamily:"'DM Sans',sans-serif",overflowX:'hidden',position:'relative'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500&display=swap');
        .feat-card:hover{border-color:#ffd4bc!important;transform:translateY(-2px);box-shadow:0 6px 24px rgba(232,93,38,0.09)!important}
        .btn-outline:hover{background:#fff0ee!important}
        .btn-solid:hover{background:#c94d1f!important}
        .cta-primary:hover{background:#c94d1f!important;transform:translateY(-1px)}
        .cta-secondary:hover{border-color:#bbb!important;background:#f4f4f4!important}

        /* ── MOBILE ── */
        @media (max-width: 640px) {
          .hero-title { font-size: 2.2rem !important; }
          .hero-section { padding: 3.5rem 1.2rem 2rem !important; }
          .features-section { padding: 2rem 1.2rem 3rem !important; }
          .features-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
          .nav-inner { padding: 1rem 1.2rem !important; }
          .nav-logo { font-size: 1.15rem !important; }
          .nav-buttons { gap: 8px !important; }
          .nav-buttons button { padding: 7px 14px !important; font-size: 13px !important; }
          .cta-buttons { flex-direction: column !important; align-items: center !important; width: 100% !important; }
          .cta-buttons button { width: 100% !important; max-width: 320px !important; }
          .blob { display: none !important; }
          .hero-desc { font-size: 0.97rem !important; }
        }

        /* ── TABLET ── */
        @media (min-width: 641px) and (max-width: 900px) {
          .hero-title { font-size: 2.7rem !important; }
          .features-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .features-section { padding: 2rem 1.5rem 3rem !important; }
        }
      `}</style>

      {/* Blobs decorativos */}
      <div className="blob" style={{position:'absolute',width:420,height:420,background:'rgba(232,93,38,0.08)',top:-120,right:-80,borderRadius:'50%',pointerEvents:'none'}}/>
      <div className="blob" style={{position:'absolute',width:280,height:280,background:'rgba(232,93,38,0.06)',bottom:60,left:-60,borderRadius:'50%',pointerEvents:'none'}}/>
      <div className="blob" style={{position:'absolute',width:160,height:160,background:'rgba(232,93,38,0.12)',top:200,left:30,borderRadius:'50%',pointerEvents:'none'}}/>

      {/* Navbar */}
      <nav style={{background:'#fff',borderBottom:'1px solid #e0e0e0',position:'relative',zIndex:10}}>
        <div className="nav-inner" style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'1.2rem 2rem'}}>
          <div className="nav-logo" style={{fontFamily:"'Playfair Display',serif",fontSize:'1.35rem',fontWeight:700,color:'#1a1a1a',letterSpacing:'-0.3px'}}>
            Sabor<span style={{color:'#e85d26'}}>&</span>Gestión
          </div>
          <div className="nav-buttons" style={{display:'flex',gap:10,alignItems:'center'}}>
            <button
              className="btn-outline"
              onClick={() => router.push('/login')}
              style={{padding:'8px 20px',border:'1.5px solid #e85d26',background:'transparent',color:'#e85d26',borderRadius:8,fontSize:14,fontWeight:500,cursor:'pointer',fontFamily:"'DM Sans',sans-serif",transition:'all .2s'}}
            >
              Iniciar sesión
            </button>
            <button
              className="btn-solid"
              onClick={() => router.push('/register')}
              style={{padding:'8px 20px',border:'none',background:'#e85d26',color:'#fff',borderRadius:8,fontSize:14,fontWeight:500,cursor:'pointer',fontFamily:"'DM Sans',sans-serif",transition:'all .2s'}}
            >
              Registrarse
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero-section" style={{display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center',padding:'5rem 2rem 3rem',position:'relative',zIndex:2}}>
        <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'#fff0ee',border:'1px solid #ffd4bc',borderRadius:20,padding:'5px 14px',fontSize:12,color:'#e85d26',fontWeight:500,marginBottom:'1.5rem',letterSpacing:'0.3px'}}>
          <span style={{width:7,height:7,borderRadius:'50%',background:'#e85d26',display:'inline-block'}}/>
          Tu restaurante, en un solo lugar
        </div>

        <h1 className="hero-title" style={{fontFamily:"'Playfair Display',serif",fontSize:'3.4rem',fontWeight:900,color:'#1a1a1a',lineHeight:1.08,marginBottom:'1.2rem',maxWidth:600}}>
          Explora el menú,<br/>reserva tu <span style={{color:'#e85d26'}}>mesa</span>
        </h1>

        <p className="hero-desc" style={{fontSize:'1.05rem',color:'#555',maxWidth:440,lineHeight:1.65,marginBottom:'2.5rem'}}>
          Descubre nuestros platos del día, consulta la disponibilidad y haz tu reserva en segundos. Todo desde aquí.
        </p>

        <div className="cta-buttons" style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
          <button
            className="cta-primary"
            style={{padding:'13px 32px',background:'#e85d26',color:'#fff',border:'none',borderRadius:10,fontSize:15,fontWeight:500,cursor:'pointer',fontFamily:"'DM Sans',sans-serif",transition:'all .2s',letterSpacing:'0.2px'}}
          >
            Ver el menú
          </button>
          <button
            className="cta-secondary"
            style={{padding:'13px 32px',background:'#fff',color:'#333',border:'1.5px solid #e0e0e0',borderRadius:10,fontSize:15,fontWeight:500,cursor:'pointer',fontFamily:"'DM Sans',sans-serif",transition:'all .2s'}}
          >
            Reservar mesa
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="features-section" style={{padding:'2.5rem 2rem 3.5rem',position:'relative',zIndex:2}}>
        <p style={{textAlign:'center',fontSize:12,fontWeight:500,color:'#e85d26',letterSpacing:'1.2px',textTransform:'uppercase',marginBottom:'0.6rem'}}>
          ¿Qué puedes hacer?
        </p>
        <div style={{width:48,height:2,background:'#e85d26',borderRadius:2,margin:'0 auto 2rem'}}/>

        <div className="features-grid" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,maxWidth:820,margin:'0 auto'}}>
          {[
            {icon:'🍽️',bg:'#fff0ee',title:'Explorar platos',desc:'Consulta nuestro menú completo, ingredientes y disponibilidad en tiempo real.'},
            {icon:'🪑',bg:'#f0f6ff',title:'Ver mesas',desc:'Revisa qué mesas están libres y elige la que mejor se adapte a tu grupo.'},
            {icon:'📅',bg:'#f0fdf4',title:'Hacer reservas',desc:'Reserva tu mesa con fecha y hora en pocos clics. Sin llamadas, sin esperas.'},
          ].map((f,i) => (
            <div
              key={i}
              className="feat-card"
              style={{background:'#fff',border:'1px solid #e8e8e8',borderRadius:14,padding:'1.4rem 1.3rem',transition:'all .22s',cursor:'pointer'}}
            >
              <div style={{width:40,height:40,borderRadius:10,background:f.bg,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'1rem',fontSize:18}}>
                {f.icon}
              </div>
              <div style={{fontSize:15,fontWeight:500,color:'#1a1a1a',marginBottom:5}}>{f.title}</div>
              <div style={{fontSize:13,color:'#888',lineHeight:1.55}}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}