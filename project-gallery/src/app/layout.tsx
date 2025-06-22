export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>  
        <hr/>
        {children}
        <hr/>
      </body>
    </html>
  )
}
