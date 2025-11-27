import { cookies } from 'next/headers'
import { getUserFromToken } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ComplaintActions from './actions'

export default async function ComplaintDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    const user = token ? await getUserFromToken(token) : null

    if (!user) return null

    const complaint = await prisma.complaint.findUnique({
        where: { id },
        include: {
            attachments: true,
            auditLogs: {
                include: { actor: true },
                orderBy: { createdAt: 'desc' }
            }
        }
    })

    if (!complaint) notFound()

    // Ensure user is authorized to view (Complainant, Assigned Officer, or Admin)
    const isComplainant = complaint.complainantId === user.id
    const isAssignedOfficer = user.role === 'DEPT_OFFICER' && user.departmentId === complaint.assignedDeptId
    const isAdmin = user.role === 'ADMIN'

    if (!isComplainant && !isAssignedOfficer && !isAdmin) {
        return <div>Unauthorized</div>
    }

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ marginBottom: '1rem' }}>
                <Link href="/dashboard/my-complaints" style={{ color: 'var(--accent)', fontSize: '0.875rem' }}>
                    ← Back to List
                </Link>
            </div>

            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{complaint.title}</h1>
                        <div style={{ display: 'flex', gap: '1rem', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                            <span>ID: {complaint.id}</span>
                            <span>Category: {complaint.category}</span>
                            <span>Date: {new Date(complaint.createdAt).toLocaleString()}</span>
                        </div>
                    </div>
                    <span style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '9999px',
                        fontWeight: '600',
                        backgroundColor: getStatusColor(complaint.status),
                        color: 'white'
                    }}>
                        {complaint.status}
                    </span>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Description</h3>
                    <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{complaint.description}</p>
                </div>

                {complaint.attachments.length > 0 && (
                    <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Attachments</h3>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            {complaint.attachments.map((file: any) => (
                                <a
                                    key={file.id}
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '0.5rem',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius)',
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    📄 {file.name}
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {complaint.resolutionSummary && (
                    <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius)' }}>
                        <h3 style={{ fontWeight: '600', color: '#166534', marginBottom: '0.5rem' }}>Resolution Summary</h3>
                        <p style={{ color: '#15803d' }}>{complaint.resolutionSummary}</p>
                    </div>
                )}

                {complaint.internalNotes && (isAssignedOfficer || isAdmin) && (
                    <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 'var(--radius)' }}>
                        <h3 style={{ fontWeight: '600', color: '#9a3412', marginBottom: '0.5rem' }}>Internal Notes</h3>
                        <p style={{ color: '#c2410c' }}>{complaint.internalNotes}</p>
                    </div>
                )}
            </div>

            <ComplaintActions
                complaintId={complaint.id}
                currentStatus={complaint.status}
                isAssignedOfficer={isAssignedOfficer}
                isAdmin={isAdmin}
            />

            <div className="card" style={{ marginTop: '1.5rem' }}>
                <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>History</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {complaint.auditLogs.map((log: any) => (
                        <div key={log.id} style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
                            <div style={{ color: 'var(--muted-foreground)', minWidth: '150px' }}>
                                {new Date(log.createdAt).toLocaleString()}
                            </div>
                            <div>
                                <span style={{ fontWeight: '600' }}>{log.action}</span>
                                <span style={{ color: 'var(--muted-foreground)' }}> by {log.actor.name}</span>
                                {log.details && <div style={{ marginTop: '0.25rem' }}>{log.details}</div>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function getStatusColor(status: string) {
    switch (status) {
        case 'SUBMITTED': return '#3b82f6';
        case 'IN_PROGRESS': return '#eab308';
        case 'ESCALATED': return '#ef4444';
        case 'RESOLVED': return '#22c55e';
        default: return '#64748b';
    }
}
