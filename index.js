const puppeter = require("puppeteer");
const readline = require("readline");
const fs = require("fs");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main(isPredicacion) {
  console.log(fs.readFileSync("carbonelogo.txt").toString());
  const zoomUser = {
    email:"",
    password:"",
  }
  const meetings = {
    predicacion: "https://jworg.zoom.us/s/83135102680?from=join#success",
    reunion: "https://jworg.zoom.us/s/82112894012?from=join#success",
  };
  const htmlSelectors = {
    loginButton: "#zoom-ui-frame > div > div > a",
    openOnBrowser:
      "#zoom-ui-frame > div > div > div > h3:nth-child(2) > span > a",
    moreOptions: "#moreButton",
    participantsPanelButton: "#foot-bar div.open.dropup.btn-group ul a",
    joinedParticipantsList: "#participants-ul",
    waitingRoomList:
      "#wc-container-right > div > section > div.scroll-content > div > ul",
    allowParticipantButton: "",
  };
  const coodinates = {
    firstParticipanWaitingRoom: { x: 685, y: 85 },
  };
  const browser = await puppeter.launch({
    headless: true,
    userDataDir: "./browserData/",
  });
  if(!zoomUser.email || !zoomUser.password){
    console.error("Credenciales de usuario inválidas");
    return;
  }
  const page = await browser.newPage();
  page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.67 Safari/537.36"
  );
  try {
    console.log("INICANDO ZOOM-BOT-WEB VERSION 1.0.0 (2022)");
    
    let selectedMeeting = isPredicacion ? meetings.predicacion : meetings.reunion;
    await page.goto(selectedMeeting, { waitUntil: "domcontentloaded" });

    try {
      //Verificar si tiene que logearse
      const loginButton = await page.waitForSelector(
        htmlSelectors.loginButton,
        {
          timeout: 3000,
        }
      );
      if (loginButton) {
        //Ir al formulario login
        await loginButton.click();
        delay(5000);

        //Confiar en las cookies
        try {
          await (
            await page.waitForSelector("#onetrust-accept-btn-handler", {
              timeout: 3000,
            })
          )?.click({ delay: 500 });
          delay(1000);
        } catch (error) {
          console.log("No se encontró cartel para aceptar cookies",error.message);
        }

        //Rellenar formulario
        await (await page.waitForSelector("#email", { timeout: 3000 })).click({delay:500});
        delay(1000);
        await page.keyboard.type(zoomUser.email);
        delay(1000);
        await (
          await page.waitForSelector("#password", { timeout: 3000 })
        ).click({delay:500});
        delay(500);
        await page.keyboard.type(zoomUser.password);
        delay(500);


        //Activar check de mantener sesion
        // await (
        //   await page.waitForSelector("#keep_me_signin", { timeout: 2000 })
        // ).click();

        //Enviar fomulario
        await (
          await page.waitForSelector("#login-form div.signin > button", {
            timeout: 2000,
          })
        ).click();
      }
    } catch (error) {
      console.log(error.message);
    }

    //Ir al la reunion de version de navegador
    await page.waitForSelector(htmlSelectors.openOnBrowser, { timeout: 10000 });
    const openOnBrowserElement = await page.$(htmlSelectors.openOnBrowser);
    openOnBrowserElement.click();

    await delay(8000);

    //Precionar boton de Mas Opciones
    console.log("Esperando boton de mas opciones");
    await page.waitForSelector(htmlSelectors.moreOptions,{timeout:5000});
    const moreOptionsButton = await page.$(htmlSelectors.moreOptions);
    moreOptionsButton.click({ delay: 500 });
    console.log("Precionando boton mas opciones");

    //Abrir panel de participantes
    console.log("Esperando boton de participantes");
    await page.waitForSelector(htmlSelectors.participantsPanelButton,{timeout:5000});
    const participantsPanelButton = await page.$(
      htmlSelectors.participantsPanelButton
    );
    participantsPanelButton.click({ delay: 500 });
    console.log("Se hizo click en boton de participantes");

    //Gestionar participantes
    console.log("Chequeando si hay participantes en sala de espera");
    while (true) {
      await delay(5000);
      const waitingRoom = await page.$(htmlSelectors.waitingRoomList);
      if (waitingRoom) {
        console.log("Se han encontrado participantes esperando...");
        const participantName = await page.$eval("#waitingRoom-li-0 > div > div > span > span",(element)=>element.textContent);
        //return;
        page.mouse.move(
          coodinates.firstParticipanWaitingRoom.x,
          coodinates.firstParticipanWaitingRoom.y,
          { steps: 5 }
        );

        //Precionar el boton admitir
        try {
          await (await page.waitForSelector("#waitingRoom-li-0 > div > span > div > div .btn")).click({delay:500, timeout:2000});
          console.log(`Aceptando a "${participantName}"`);
        } catch (error) {
          console.log(`No se pudo admitir a ${participantName} quizas todavía está entrando.`)
        }
      } else {
        console.log(`No hay participantes en sala de espera. Ultima revisión: ${new Date().toLocaleString()}.`);
      }
    }
  } catch (error) {
    console.log(error.message);
    await page.screenshot({ path: "./errors/error.png", type: "png" });
  }
}
async function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}
console.log(process.argv.find((arg)=>arg.includes("--mode")));
const modeArg = process.argv.find((arg)=>arg.includes("--mode"));
if(modeArg){
  const mode = modeArg.split("=");
  if(mode[1] || mode[1] == "predicacion" || mode[1] == "reunion"){
    console.log("Iniciando en modo "+mode[1]);
    main(mode[1] == "predicacion" ? true : false);
  }
  else{
    console.log("Error al procesar el argumeto model. Ejemplo: --mode=[predicacion | reunion]")
  }
}
else{
  rl.question("Predicacion (1) o reunión semanal(2)?", function(res) {
    main(res == 1 ? true : false);
  });
}
