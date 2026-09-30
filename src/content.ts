// All editable portfolio content lives here. A future CMS only needs to produce this shape.
export const OS = { name: 'Aaryx', version: '21' }

export const PROFILE = {
  name: 'AARYAN SINGH',
  role: 'CS Student',
  photo: 'https://res.cloudinary.com/dpuitsxuh/image/upload/v1790753226/WhatsApp_Image_2026-04-16_at_11.12.10_AM_xe7um9.jpg',
  bio: "I'm a Computer Science developer passionate about building secure, scalable, and impactful software. My interests span **full-stack development, cybersecurity, cloud computing, and system design**, with a strong focus on turning complex problems into practical solutions. I enjoy building real-world projects, exploring emerging technologies, and continuously sharpening my engineering skills through hands-on development.",
  resume: '/resume.pdf',
}

export const CONTACT = {
  linkedin: { label: 'LinkedIn', handle: 'linkedin.com/in/aaryan-singh-ab8812348', url: 'https://www.linkedin.com/in/aaryan-singh-ab8812348' },
  github: { label: 'GitHub', handle: 'github.com/aaryx', url: 'https://github.com/aaryx' },
  email: { label: 'Email', handle: 'aaryansingh24082005@gmail.com', url: 'mailto:aaryansingh24082005@gmail.com' },
}

export type Project = { slug: string; name: string; tagline: string; about: string; stack: string[]; repo: string }
export const PROJECTS: Project[] = [
  {
    slug: 'websentinel', name: 'WebSentinel', tagline: 'Web security scanner',
    about: 'Security-focused web analysis project for reconnaissance and vulnerability assessment of websites.',
    stack: ['Python', 'Web Security', 'Recon', 'Linux'], repo: 'https://github.com/aaryx/websentinel',
  },
  {
    slug: 'PhisGuard-', name: 'PhishGuard', tagline: 'Phishing detection browser extension',
    about: 'Privacy-first browser extension for real-time phishing detection using URL, domain, form, brand-impersonation and Unicode lookalike analysis. Generates an explainable 0–100 risk score with human-readable security reasoning.',
    stack: ['JavaScript', 'Browser Extension', 'DOM Analysis', 'Risk Scoring'], repo: 'https://github.com/aaryx/PhisGuard-',
  },
]

export const SKILLS = ['Nmap', 'Wireshark', 'Metasploit', 'Netcat', 'Linux CLI', 'TCP/IP', 'DNS', 'Web Security', 'Vulnerability Assessment']

// ponytail: GitHub's auto-generated social card stands in for real screenshots; drop a real image URL here to override.
export const preview = (p: Project) => `https://opengraph.githubassets.com/1/${p.repo.split('github.com/')[1]}`

// Retro Windows-era desktops, recreated in pure CSS (the originals are Microsoft-copyrighted, so no hotlinking).
export const WALLPAPERS: Record<string, string> = {
  'Windows 95 · Clouds': 'radial-gradient(ellipse 22% 9% at 18% 22%,#fff 40%,#fff0 70%),radial-gradient(ellipse 30% 11% at 30% 26%,#f4f8ff 35%,#fff0 70%),radial-gradient(ellipse 26% 10% at 72% 40%,#fff 38%,#fff0 70%),radial-gradient(ellipse 34% 12% at 60% 44%,#eef4ff 30%,#fff0 70%),radial-gradient(ellipse 24% 9% at 35% 70%,#fff 38%,#fff0 70%),radial-gradient(ellipse 30% 10% at 82% 78%,#f6f9ff 35%,#fff0 70%),linear-gradient(#3d7fd6,#7fb2ee 60%,#a9cdf5)',
  'Windows 98 · Teal': 'repeating-conic-gradient(#0000 0 25%,#ffffff08 0 50%) 0 0/4px 4px,radial-gradient(circle at 50% 45%,#0a9a9a,#008080 55%,#006a6a)',
  'Windows 2000 · Blue': 'radial-gradient(ellipse 90% 60% at 100% 110%,#5a8ccf 0 30%,#0000 60%),linear-gradient(160deg,#1c3f7a,#3a6ea5 55%,#2b5a93)',
  'Windows ME · Horizon': 'radial-gradient(ellipse 80% 30% at 50% 100%,#8bd6ff 0,#0000 70%),linear-gradient(#0b2a6b,#1f5fbf 60%,#58a6ec)',
  'Windows XP · Bliss': 'radial-gradient(ellipse 120% 55% at 30% 110%,#5fae2f 0 55%,#3e8a1e 70%,#0000 71%),radial-gradient(ellipse 100% 45% at 90% 115%,#4c9a25 0 60%,#0000 61%),radial-gradient(ellipse 18% 6% at 70% 22%,#fff 30%,#fff0 70%),radial-gradient(ellipse 24% 7% at 30% 30%,#ffffffcc 30%,#fff0 70%),linear-gradient(#2e6fd8,#6aa5ef 50%,#b7d7fb)',
  'Windows Vista · Aurora': 'radial-gradient(ellipse 70% 20% at 40% 55%,#7ee07a88,#0000 70%),radial-gradient(ellipse 60% 14% at 65% 45%,#3fd0b088,#0000 70%),linear-gradient(170deg,#021a10,#0b3b24 45%,#010805)',
  'Windows 7 · Harmony': 'radial-gradient(circle at 50% 50%,#ffffff22 0 6%,#0000 20%),conic-gradient(from 200deg at 50% 52%,#0000,#ffffff14,#0000 20%),radial-gradient(ellipse at 50% 40%,#2a8ce0,#0f5aa8 50%,#07366e)',
}

