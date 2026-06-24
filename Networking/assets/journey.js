// ── Packet Journey interactive steps ──
let jStep = 0;
const jTotal = 12;
const jDevs  = ['dev-laptop','dev-router','dev-isp','dev-backbone','dev-google'];
const jLinks = ['link-1','link-2','link-3','link-4'];
const jPositions = [
  { dev: 0, x: 60,  link: null },
  { dev: 0, x: 60,  link: null },
  { dev: 0, x: 60,  link: null },
  { dev: 0, x: 60,  link: null },
  { dev: 0, x: 60,  link: 0    },
  { dev: 1, x: 200, link: 0    },
  { dev: 1, x: 200, link: 1    },
  { dev: 2, x: 350, link: 2    },
  { dev: 3, x: 500, link: 3    },
  { dev: 4, x: 640, link: null },
  { dev: 4, x: 640, link: null },
  { dev: 0, x: 60,  link: null },
];
const statuses = [
  'Chrome: "https://" → port 443',
  'DNS lookup for google.com',
  'Checking: is Google\'s IP on local network?',
  'ARP: "Who has 192.168.1.1?"',
  'Packet sent to home router',
  'NAT: private IP → public IP',
  'Router forwards to ISP',
  'ISP → Backbone routing',
  'Final ARP + delivery to Google',
  'Google unpacks all 5 layers',
  'Response travels back via NAT',
  'Chrome renders the page!',
];

function updateJourney() {
  document.getElementById('step-num').textContent = jStep + 1;
  document.querySelectorAll('[id^="jstep-"]').forEach(el => el.classList.remove('active'));
  document.getElementById('jstep-' + jStep).classList.add('active');
  const pos = jPositions[jStep];
  const dot = document.getElementById('packet-dot');
  dot.setAttribute('cx', pos.x);
  dot.setAttribute('cy', 50);
  dot.setAttribute('opacity', 1);
  jDevs.forEach((id, i) => {
    const el = document.getElementById(id);
    el.setAttribute('stroke', i === pos.dev ? '#6c8ef7' : '#2e3352');
    el.setAttribute('stroke-width', i === pos.dev ? '2.5' : '1.5');
  });
  jLinks.forEach((id, i) => {
    const el = document.getElementById(id);
    el.setAttribute('stroke', pos.link === i ? '#6c8ef7' : '#2e3352');
    el.setAttribute('stroke-width', pos.link === i ? '3' : '2');
  });
  document.getElementById('journey-status').textContent = statuses[jStep];
}

function journeyStep(dir) {
  jStep = Math.max(0, Math.min(jTotal - 1, jStep + dir));
  updateJourney();
}
function journeyReset() { jStep = 0; updateJourney(); }

window.journeyStep  = journeyStep;
window.journeyReset = journeyReset;

updateJourney();
