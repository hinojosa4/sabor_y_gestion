import React, { useState } from 'react'

const roles = [
  {
    icon: '👔',
    name: "admin",
    trabajo: "Acceso completo al \nsistema de gestion",
    color: "#8E24AA",
    bgColor: "bg-[#a855f7]"
  },
  {
    icon: '👨‍🍳',
    name: "cajero",
    trabajo: "Gestiona las ventas y \nfacturación",
    color: "#FB8C00",
    bgColor: "bg-[#FFA500]"
  },
  {
    icon: '🍽️',
    name: "cocinero",
    trabajo: "Gestiona de ordenes y \ncocina",
    color: "#1E88E5",
    bgColor: "bg-[#2196F3]"
  },
  {
    icon: '💰',
    name: "mesero",
    trabajo: "Gestión de mesas y \nordenes",
    color: "#43A047",
    bgColor: "bg-[#4CAF50]"
  }
]

interface RoleCardProps {
  setRole: React.Dispatch<React.SetStateAction<string>>,
}

export const RoleCard = ({setRole}:RoleCardProps) => {

  const [cardSelected, setCardSelected] = useState("admin")

  const handleRoleSelect = (name: string) => {
    setCardSelected(name);
    setRole(name);
  }

  return (
    <div className='width-auto grid grid-cols-2 gap-[10] mt-[40px] mb-[30px]'>
        {
            roles.map( (rolItem, index) => (
                <button 
                    key={index}
                    onClick={() => handleRoleSelect(rolItem.name)}
                    className={`flex flex-col items-center text-[1.6rem] cursor-pointer w-[11rem] 
                                border rounded-[6%] p-[20] gap-[5]
                                ${cardSelected === rolItem.name ? ` ${rolItem.bgColor} border-[purple] 
                                transition-all duration-200 scale-105 hover:border-[purple]` : 
                                'border-[#D1D5DB] hover:border-[#BA68C8] bg-[white] transition-all duration-200'}`}>
                        {rolItem.icon}
                        <span className='text-[15px]'> {rolItem.name} </span>
                </button>
            ))
        }
    </div>
  )
}


