/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

import { main, container, brandBar, brandMark, brandTag, h1, text, button, footer, divider } from './_styles.ts'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your {siteName} password</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Text style={brandMark}>MARTIAL ATHLETIC</Text>
          <Text style={brandTag}>TRAIN HARDER. COMPETE SMARTER.</Text>
        </Section>
        <Heading style={h1}>RESET YOUR PASSWORD</Heading>
        <Text style={text}>
          We received a request to reset your password for {siteName}. Click the
          button below to choose a new one.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Reset Password
        </Button>
        <Section style={divider} />
        <Text style={footer}>
          If you didn't request this, you can safely ignore this email. Your
          password will not change.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
