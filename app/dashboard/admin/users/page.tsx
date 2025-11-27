import { cookies } from 'next/headers'
import { getUserFromToken } from '@/lib/auth'
import { prisma } from '@/lib/db'

export default async function UserManagementPage() {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    const user = token ? await getUserFromToken(token) : null

    if (!user || user.role !== 'ADMIN') {
        return <div>Unauthorized</div>
    }

    const users = await prisma.user.findMany({
        orderBy: { name: 'asc' },
        include: { department: true }
    })

    return (
        <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>User Management</h1>

            <div className="card">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                            <th style={{ padding: '0.75rem' }}>Name</th>
                            <th style={{ padding: '0.75rem' }}>Email</th>
                            <th style={{ padding: '0.75rem' }}>Role</th>
                            <th style={{ padding: '0.75rem' }}>Department</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '0.75rem' }}>{u.name}</td>
                                <td style={{ padding: '0.75rem' }}>{u.email}</td>
                                <td style={{ padding: '0.75rem' }}>{u.role}</td>
                                <td style={{ padding: '0.75rem' }}>{u.department?.name || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
