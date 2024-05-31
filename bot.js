require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_API_KEY
const supabase = createClient(supabaseUrl, supabaseKey)
const { Telegraf } = require('telegraf')
const https = require('https')
const axios = require('axios')
const agent = new https.Agent({
  rejectUnauthorized: false,
})
const tokenBot = process.env.TELEGRAM_BOT_TOKEN

const bot = new Telegraf(tokenBot)

bot.start(async (ctx) => {
  const { error } = await supabase.from('usuarios').insert({ id: ctx.chat.id })

  if (error) {
    console.log(`No se pudo guardar en la base de datos ${error}`)
  }
  ctx.reply(
    `Bienvenid@ ${ctx.from.first_name}!, a partir de ahora recibiras notificaciones cada cierto tiempo del estado actual del sistema CumLaude.\nSe ha guardado tu Chat ID: ${ctx.chat.id}`
  )
})

async function checkandSendMessage() {
  try {
    const response = await axios.get(
      'https://cumlaude.ucla.edu.ve/CumLaudeDCYT/',
      { httpsAgent: agent }
    )
    if (response.status === 200) {
      async function recuperarUsuarios() {
        const { data, error } = await supabase.from('usuarios').select('id')

        if (error) {
          console.log('No se pudo recuperar la ID')
          console.log(error)
        }

        if (data) {
          const mensajeOK = `Sistema CumLaude en línea, Estatus: 🟢 ${response.status}`
          const datos = data
          JSON.stringify(datos)
          datos.forEach((dato) => {
            bot.telegram.sendMessage(dato.id, mensajeOK)
          })
        }
      }
      recuperarUsuarios()
    } else if (response.status !== 200) {
      async function recuperarUsuariosOFF() {
        const { data, error } = await supabase.from('usuarios').select('id')

        if (error) {
          console.log('No se pudo recuperar la ID')
          console.log(error)
        }

        if (data) {
          const mensajeOFF = `Sistema CumLaude fuera de línea, Estatus: 🔴 ${response.status}, toma un café mientras vuelve ☕️`
          const datos = data
          JSON.stringify(datos)
          datos.forEach((dato) => {
            bot.telegram.sendMessage(dato.id, mensajeOFF)
          })
        }
      }
      recuperarUsuariosOFF()
    }
  } catch (error) {
    console.error(`Error al verificar el sitio: ${error.message}`)
  }
}
const intervaloMilisegundos = 12 * 60 * 60 * 1000
setInterval(checkandSendMessage, intervaloMilisegundos)

bot.command('listar', async (ctx) => {
  const { data, error } = await supabase.from('usuarios').select('id')

  if (error) {
    ctx.reply('No se pudo recuperar la ID')
    console.log(error)
  }

  if (data) {
    const datos = data
    ctx.reply(`La id es: ${JSON.stringify(datos)}`)
  }
})

bot.command('check', (ctx) => {
  ctx.reply('Consultando estado...')
  async function verificarSitioWeb(url) {
    try {
      const response = await axios.get(url, { httpsAgent: agent })
      if (response.status === 200) {
        ctx.reply(
          `El sitio ${url} está activo.\nESTATUS: 🟢 ${response.status}`
        )
      } else if (response.status !== 200) {
        ctx.reply(
          `El sitio ${url} no está disponible\n(código de estado: 🔴 ${response.status}).`
        )
      }
    } catch (error) {
      console.error(`Error al verificar el sitio ${url}: ${error.message}`)
      ctx.reply(
        `Sistema CumLaude fuera de línea, toma un café mientras vuelve ☕️\n URL: ${url}`
      )
    }
  }
  const urlVerificar = 'https://cumlaude.ucla.edu.ve/CumLaudeDCYT/'
  verificarSitioWeb(urlVerificar)
})

bot.command('info', (ctx) => {
  ctx.reply(
    'Este bot fue creado por el estudiante de Ing. Informática, José Graterol, este bot guarda el chatID en una base de datos para uso de notificaciones al hacer algún chequeo del Sistema CumLaude \nEste bot fue creado con las siguientes tecnologías:\nTelegraf: Libreria de desarrollo del bot\nNodeJS y JavaScript: Este bot ha sido escrito el lenguaje de JavaScript y puesto en linea con NodeJS\nSupaBase: Base de datos Open Source para guardar los chatID\nAXIOS: Peticiones HTTP hacia CumLaude.\n Si necesitas ayuda tienes los siguientes comandos:\n\n /check Chequea el estado del sistema CumLaude\n /salir Para no recibir mas notificaciones\n /info para desplegar este mensaje'
  )
})

bot.command('salir', async (ctx) => {
  const { error } = await supabase
    .from('usuarios')
    .delete()
    .eq('id', ctx.chat.id)
  if (error) {
    console.log(`No se pudo borrar el usuario, error: ${error}`)
    ctx.reply(`No se pudo borrar el usuario, error: ${error}`)
  }
  ctx.reply(
    'Has salido, no llegarán mas notificaciones, aún así puedes usar el comando /check para revisar.\nSi quieres volver a recibir notificaciones, usar el comando /start'
  )
})

bot.launch()
