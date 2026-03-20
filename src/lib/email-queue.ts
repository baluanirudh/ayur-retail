import nodemailer from 'nodemailer'
import prisma from './db'
import dns from 'dns'

function isOnline(): Promise<boolean> {
  return new Promise((resolve) => {
    dns.lookup('8.8.8.8', (err) => resolve(!err))
  })
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  tls: {
    rejectUnauthorized: false,
  },
})

export async function sendOrQueueEmail(email: {
  recipient: string
  subject: string
  body: string
}) {
  if (!email.recipient) return

  const online = await isOnline()

  if (online) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email.recipient,
        subject: email.subject,
        html: email.body,
      })
    } catch {
      await queueEmail(email)
    }
  } else {
    await queueEmail(email)
  }
}

async function queueEmail(email: {
  recipient: string
  subject: string
  body: string
}) {
  await prisma.emailQueue.create({
    data: {
      recipient: email.recipient,
      subject: email.subject,
      body: email.body,
      status: 'pending',
    },
  })
}

export async function flushEmailQueue() {
  try {
    const pending = await prisma.emailQueue.findMany({
      where: { status: 'pending' },
    })
    for (const email of pending) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: email.recipient,
          subject: email.subject,
          html: email.body,
        })
        await prisma.emailQueue.update({
          where: { id: email.id },
          data: { status: 'sent', sentAt: new Date() },
        })
      } catch {
        // leave as pending, try next time
      }
    }
  } catch (err) {
    console.log('Email queue not ready yet:', err)
  }
}