import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/custom-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react"

interface ForgotPasswordFormProps {
  onBackToLogin: () => void
}

export function ForgotPasswordForm({ onBackToLogin }: ForgotPasswordFormProps) {
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      toast({
        title: "Error",
        description: "Email harus diisi",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error

      setEmailSent(true)
      toast({
        title: "Email Terkirim",
        description: "Silakan cek email Anda untuk instruksi reset password",
      })
    } catch (error: any) {
      console.error("Forgot password error:", error)
      toast({
        title: "Error",
        description: error.message || "Gagal mengirim email reset password",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (emailSent) {
    return (
      <Card className="w-full max-w-md mx-auto bg-white/95 backdrop-blur-sm shadow-xl border-0">
        <CardContent className="pt-8 pb-6 text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold">Email Terkirim!</h3>
          <p className="text-gray-600">
            Kami telah mengirim link reset password ke <strong>{email}</strong>
          </p>
          <p className="text-sm text-gray-500">
            Silakan cek inbox atau folder spam Anda.
          </p>
          <Button
            onClick={onBackToLogin}
            variant="outline"
            className="w-full mt-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Login
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto bg-white/95 backdrop-blur-sm shadow-xl border-0">
      <CardHeader className="text-center pb-6">
        <div className="w-16 h-16 bg-gradient-to-r from-primary to-teal rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold text-foreground">Lupa Password</CardTitle>
        <CardDescription className="text-muted-foreground">
          Masukkan email Anda dan kami akan mengirim link untuk reset password
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="masukkan@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                disabled={loading}
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="hero"
            size="lg"
            className="w-full mt-6"
            disabled={loading || !email}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mengirim...
              </>
            ) : (
              "Kirim Link Reset Password"
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={onBackToLogin}
            disabled={loading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Login
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
