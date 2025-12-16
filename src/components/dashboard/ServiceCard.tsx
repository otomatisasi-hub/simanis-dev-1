import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/custom-button"
import { LucideIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"

interface ServiceCardProps {
  title: string
  description: string
  icon: LucideIcon
  color: "primary" | "teal" | "success" | "warning"
  onClick?: () => void
  navigateTo?: string
  count?: number
}

export function ServiceCard({ title, description, icon: Icon, color, onClick, navigateTo, count }: ServiceCardProps) {
  const navigate = useNavigate()

  const handleClick = () => {
    if (navigateTo) {
      navigate(navigateTo)
    } else if (onClick) {
      onClick()
    }
  }
  const colorClasses = {
    primary: "from-primary to-primary-light",
    teal: "from-teal to-teal-light", 
    success: "from-success to-success/80",
    warning: "from-warning to-warning/80"
  }

  return (
    <Card className="group cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br from-card to-secondary">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-lg bg-gradient-to-r ${colorClasses[color]} text-white shadow-md`}>
            <Icon className="h-6 w-6" />
          </div>
          {count !== undefined && (
            <div className="bg-muted text-muted-foreground px-2 py-1 rounded-full text-xs font-medium">
              {count}
            </div>
          )}
        </div>
        
        <h3 className="text-lg font-semibold text-card-foreground mb-2 group-hover:text-primary transition-colors">
          {title}
        </h3>
        
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {description}
        </p>
        
        <Button 
          variant="card" 
          size="sm" 
          className="w-full"
          onClick={handleClick}
        >
          Akses Layanan
        </Button>
      </CardContent>
    </Card>
  )
}