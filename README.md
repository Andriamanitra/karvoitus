# KARVOITUS
###### HTML5 Kuva-arvoituspeli node.js avulla

Work in progress...

#### **MONSTER** NICE IDEAS
* MONTA PIIRTÄJÄÄ SAMALLA PIIRTOVUOROLLA
* IRC-INTEGRAATIO
* Login / jonkinasteinen nimimerkin suojaus?

##### KNOWN ISSUES:
* serverin boottaamisen jälkeen ensimmäinen sana ei välttämättä näy piirtäjälle (ehkä korjaantunut?)
* piirtäminen ei (ehkä?) toimi selaimilla joissa vajaa html5-tuki (edge, safari?, ie?, opera?)
  * HTML5 input type=color ei tuettu kovin laajalti, oma värinvalitsin tilalle? jscolor?
* piirtäjä voi arvata oman sanansa - feature, ei bugi. ei korjata

##### TODO LIST:
* Piirtotyökaluja:
  * fill (almost done)
  * kolmiot?
  * smudge?
* kehitä sanalistaa
* erilliset pelihuoneet (alhainen prioriteetti)
* tempPiirto erilliselle layerille jotta koko kuvaa ei tarvitse piirtää joka välissä uudestaan
* järkevöitä koodia:
  * look into context save & restore
  * piirtohommat voisi varmasti jäsennellä fiksumminkin
  * nimeä funktiot ja muuttujat loogisemmin ja kommentoi coodi
* kirjota koko roska uusiks (crystal-lang + kemal?) ja koita tällä kertaa jaotella ees VÄHÄN toiminnallisuutta eri tiedostoihin/moduleihin
