
import { ArrowRight } from "lucide-react"

interface rolesCard {
    icon: React.ReactNode,
    rol: string,
    trabajo: string,
    color: string
}

export const LoginUserCard = ({icon, rol, trabajo, color}: rolesCard) => {
  
  return (
    <div >
      <div style={{color: `${color}`}}>{icon}</div>
      <h2>{rol}</h2>
      <p className="opacity-[70%]" >{trabajo}</p>
      <span className="flex flex-row justify-center items-center gap-[5]" style={{color: `${color}`}}>Acceder <ArrowRight size={15}/></span>
    </div>
  )
}
