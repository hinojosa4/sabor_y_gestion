
import { LoginUserCard } from "./LoginUserCard";
import { 
  ChefHat, 
  Users, 
  CreditCard, 
  Briefcase,
} from 'lucide-react';

const roles = [
  {
    icon: <Briefcase size={40}/>,
    name: "Admin",
    trabajo: "Acceso completo al \nsistema de gestion",
    color: "#8E24AA",
    bgColor: "#F0FDF4"
  },
  {
    icon: <CreditCard size={40}/>,
    name: "Cajero",
    trabajo: "Gestiona las ventas y \nfacturación",
    color: "#FB8C00",
    bgColor: "#FFF7ED"
  },
  {
    icon: <ChefHat size={40}/>,
    name: "Cocinero",
    trabajo: "Gestiona de ordenes y \ncocina",
    color: "#1E88E5",
    bgColor: "#eff6ff"
  },
  {
    icon: <Users size={40}/>,
    name: "Mesero",
    trabajo: "Gestión de mesas y \nordenes",
    color: "#43A047",
    bgColor: "#f0fdf4"
  }
]

interface selectedRole {
    setSelectedRole: React.Dispatch<React.SetStateAction<boolean>>,
    setSelectedRoleButton: React.Dispatch<React.SetStateAction<string>>,
}

export const SelectRole = ({setSelectedRole, setSelectedRoleButton}:selectedRole) => {

    const handleOnClick = (userRol: string) => {
        setSelectedRole(true)
        setSelectedRoleButton(userRol)
    }

  return (
    <div> 
        <div className="flex flex-row justify-center items-center gap-[25]">
          {
            roles.map((rol, index) => (
              <button 
                onClick={() => handleOnClick(rol.name)} 
                key={index} 
                className={`w-[180px] h-[200px] whitespace-pre-line rounded-[6%] p-[6] border-[2] hover:scale-105 hover:shadow-lg transition-transform duration-200 ease-in-out`} 
                style={{backgroundColor: `${rol.bgColor}`, borderColor: `${rol.color}`}}
              >
                <LoginUserCard icon={rol.icon} rol={rol.name} trabajo={rol.trabajo} color={rol.color}/>
              </button>
            ))
          }
        </div>
    </div>
  )
}
