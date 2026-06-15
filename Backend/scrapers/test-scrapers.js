;(async () => {
  const k = require('./kenyabuzz')
  const t = require('./ticketsasa')
  const m = require('./mookh')
  for (const [name, s] of [['kenyabuzz', k], ['ticketsasa', t], ['mookh', m]]) {
    const events = await s.scrape()
    console.log(name + ': ' + events.length + ' events')
    events.slice(0, 2).forEach(function(e) {
      console.log('  - ' + e.name + ' | ' + e.city + ' | ' + e.pillar + ' | ' + (e.imageUrl ? e.imageUrl.slice(0, 60) : '(no img)'))
    })
  }
})().catch(function(e) { console.error(e.message) })
