import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Martial Athletic'
const APP_URL = 'https://martialathletic.fitness'

interface GymInviteProps {
  gymName?: string
  inviterName?: string
}

const GymInviteEmail = ({ gymName, inviterName }: GymInviteProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`You've been invited to join ${gymName ?? 'a gym'} on ${SITE_NAME}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>You're invited!</Heading>
        <Text style={text}>
          {inviterName ? `${inviterName} has invited you` : 'You have been invited'}
          {gymName ? ` to join ${gymName}` : ' to join a gym'} on {SITE_NAME}.
        </Text>
        <Text style={text}>
          Create an account or sign in with this email and you'll be added to the gym automatically.
        </Text>
        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button href={`${APP_URL}/register`} style={button}>
            Accept invitation
          </Button>
        </Section>
        <Text style={footer}>Train harder. Compete smarter. — The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: GymInviteEmail,
  subject: (d: Record<string, any>) =>
    `You've been invited to join ${d?.gymName ?? 'a gym'} on ${SITE_NAME}`,
  displayName: 'Gym member invitation',
  previewData: { gymName: 'CrossFit Cape Town', inviterName: 'Jane' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 24px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#0a0a0a', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#3f3f46', lineHeight: '1.6', margin: '0 0 16px' }
const button = {
  backgroundColor: '#dc2626',
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: '15px',
}
const footer = { fontSize: '12px', color: '#71717a', margin: '32px 0 0' }
