import { Button } from "@/components/ui/custom-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  UserPlus, 
  FileText, 
  Calendar, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Users,
  CheckCircle2
} from "lucide-react"
import { useNavigate } from "react-router-dom"

interface QuickActionProps {
  title: string
  description: string
  icon: React.ElementType
  action: () => void
  variant?: "default" | "primary" | "teal" | "success" | "warning"
}

function QuickActionButton({ title, description, icon: Icon, action, variant = "default" }: QuickActionProps) {
  const variantClasses = {
    default: "hover:bg-muted/50",
    primary: "hover:bg-primary/10 hover:border-primary/20",
    teal: "hover:bg-teal/10 hover:border-teal/20",
    success: "hover:bg-success/10 hover:border-success/20",
    warning: "hover:bg-warning/10 hover:border-warning/20"
  }

  return (
    <Card className={`cursor-pointer transition-all duration-200 hover:shadow-md ${variantClasses[variant]}`} onClick={action}>
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-muted">
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-sm">{title}</h4>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function QuickActions() {
  const navigate = useNavigate()

  const quickActions = [
    {
      title: "Tambah Klien Baru",
      description: "Daftarkan klien individu/badan hukum",
      icon: UserPlus,
      action: () => navigate("/clients?action=add"),
      variant: "primary" as const
    },
    {
      title: "Buat Layanan Baru",
      description: "Mulai proses layanan notaris/PPAT",
      icon: FileText,
      action: () => navigate("/services?action=create"),
      variant: "teal" as const
    },
    {
      title: "Jadwal Hari Ini",
      description: "Lihat agenda dan appointment",
      icon: Calendar,
      action: () => console.log("Opening calendar"),
      variant: "success" as const
    },
    {
      title: "Dokumen Tertunda",
      description: "Review dokumen yang perlu diproses",
      icon: Clock,
      action: () => navigate("/services?status=pending_documents"),
      variant: "warning" as const
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Aksi Cepat</h3>
        <p className="text-muted-foreground text-sm">Akses fitur yang sering digunakan dengan cepat</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quickActions.map((action, index) => (
          <QuickActionButton key={index} {...action} />
        ))}
      </div>
    </div>
  )
}

export function StatsCards() {
  const stats = [
    {
      title: "Total Klien",
      value: "156",
      change: "+12%",
      changeType: "positive" as const,
      icon: Users,
      description: "vs bulan lalu"
    },
    {
      title: "Layanan Aktif",
      value: "28",
      change: "+8%",
      changeType: "positive" as const,
      icon: FileText,
      description: "sedang diproses"
    },
    {
      title: "Selesai Bulan Ini",
      value: "42",
      change: "+15%",
      changeType: "positive" as const,
      icon: CheckCircle2,
      description: "vs bulan lalu"
    },
    {
      title: "Tertunda",
      value: "6",
      change: "-23%",
      changeType: "negative" as const,
      icon: AlertCircle,
      description: "perlu perhatian"
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="animate-fade-in hover:shadow-md transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-2xl font-bold">{stat.value}</span>
                  <Badge 
                    variant={stat.changeType === "positive" ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {stat.change}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}