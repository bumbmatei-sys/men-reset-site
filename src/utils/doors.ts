export interface Door { name: string; text: string; soon?: { text: string; href: string } }
export const DOORS: Door[] = [
  { name: "Know God's love", text: 'Before anything you do, He loves you. Start here if you\u2019re not sure He does.', soon: { text: 'Coming soon. For now, read the teachings on grace.', href: '/teachings' } },
  { name: 'Know who you are', text: 'Who you are in Christ, not what you did last night.', soon: { text: 'Coming soon. For now, read Identity in Christ.', href: '/teachings/identity-in-christ-2026' } },
  { name: 'Walk in holiness', text: 'Freedom from sin and from what has a hold on you. Grace first, then the next plain step.' },
  { name: 'Take initiative', text: 'Stand firm, love people, and build what God made you for.' },
];
