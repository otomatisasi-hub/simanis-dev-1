import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Plus, Edit, Trash2, Eye, Filter } from "lucide-react"

interface Customer {
  id: string
  no: number
  nama: string
  lokasi: string
  kategori: string
  tanggalPembuatan: string
  user: string
}

const sampleCustomers: Customer[] = [
  {
    id: "1",
    no: 1,
    nama: "PT ABC",
    lokasi: "KOT. BAR",
    kategori: "CORPORATE",
    tanggalPembuatan: "8/3/2023",
    user: "A MC"
  },
  {
    id: "2", 
    no: 2,
    nama: "HILDA",
    lokasi: "KOT. BAR",
    kategori: "INDIVIDUAL",
    tanggalPembuatan: "4/4/2022",
    user: "ADMIN"
  }
]

export function CustomerManagement() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedUser, setSelectedUser] = useState("")
  const [selectedProvince, setSelectedProvince] = useState("")
  const [selectedCity, setSelectedCity] = useState("")

  const filteredCustomers = sampleCustomers.filter(customer => {
    const matchesSearch = customer.nama.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || selectedCategory === "all" || customer.kategori === selectedCategory
    const matchesUser = !selectedUser || selectedUser === "all" || customer.user === selectedUser
    return matchesSearch && matchesCategory && matchesUser
  })

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pelanggan - Notaris</h2>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Super Admin</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Tambah Pelanggan
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                <SelectItem value="CORPORATE">Corporate</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua User</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="A MC">A MC</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedProvince} onValueChange={setSelectedProvince}>
              <SelectTrigger>
                <SelectValue placeholder="Provinsi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Provinsi</SelectItem>
                <SelectItem value="JAWA_BARAT">Jawa Barat</SelectItem>
                <SelectItem value="DKI_JAKARTA">DKI Jakarta</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger>
                <SelectValue placeholder="Kab/Kota" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kota</SelectItem>
                <SelectItem value="BANDUNG">Bandung</SelectItem>
                <SelectItem value="JAKARTA">Jakarta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">No.</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Lokasi</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Tanggal Pembuatan</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="w-32">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.no}</TableCell>
                  <TableCell className="font-medium">{customer.nama}</TableCell>
                  <TableCell>{customer.lokasi}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      customer.kategori === 'CORPORATE' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {customer.kategori}
                    </span>
                  </TableCell>
                  <TableCell>{customer.tanggalPembuatan}</TableCell>
                  <TableCell>{customer.user}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}