import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Card as EngineCard} from './../../../../../interfaces/game-engine/card/card/card';
import { FightResult } from 'src/app/interfaces/played-game/fight-result/fight-result';
import { GameDataStructure } from 'src/app/interfaces/game-data-structure';
import { Subscription } from 'rxjs';
import { PlayedGameService } from 'src/app/services/played-game/played-game-service';
import { SharedService } from 'src/app/services/shared.service';
import { GameEngineService } from 'src/app/services/game-engine/game-engine.service';
import { EnemyCard } from 'src/app/interfaces/played-game/card/enemy-card/enemy-card';
import { EnemyCardList } from 'src/app/interfaces/played-game/card/enemy-card/enemy-card-list';
import { Player } from 'src/app/interfaces/played-game/player/player';


@Component({
  selector: 'app-notification-fight-enemy',
  templateUrl: './notification-fight-enemy.component.html',
  styleUrls: ['./notification-fight-enemy.component.css']
})
export class NotificationFightEnemyComponent implements OnInit, OnDestroy{
  @Input() notificationData!: any;
  @Input() gameContinueFlag!: boolean;
  @Input() dieData!: {fightEnemyCondition: boolean, rollValue: number}
  @Input() finishCondition!: boolean;
  @Input() showFightEnemyCard!: boolean;
  @Output() finishConditionChange = new EventEmitter<boolean>();
  @Output() cardFightCondition = new EventEmitter<boolean>();

  toDeleteSubscription: Subscription[] = [];
  requestStructure!: GameDataStructure;
  fightResult!: FightResult;
  cardToDisplay!: EngineCard;
  cardAttributes: number[] = [];
  fightResultCondition: boolean = false;
  bridgeFlag: boolean = false; // player is on bridge field
  bossRoomFlag: boolean = false; // player is on boss field
  cardDisplayCondition: boolean = false;
  playerRoll: number = 0;
  enemyRoll: number = 0;

  constructor(private engineService: GameEngineService, private playedGameService: PlayedGameService, private shared: SharedService){

  }

  ngOnInit(): void {
    this.requestStructure = this.shared.getRequest();
    this.handleEnemyCardFight()
  }

  handleEnemyCardFight(){
    this.checkField();
  }

  checkField(){
    this.toDeleteSubscription.push(
      this.playedGameService.getPlayer(this.requestStructure.game!.id, this.requestStructure.player!.login).subscribe( (data: Player) => {
        if(data.character.field!.id == this.requestStructure.bossFieldId!){
          this.bossRoomFlag = true;
        }
        if(data.character.field!.id == this.requestStructure.bridgeFieldId!){
          this.bridgeFlag = true;
        }
        this.fetchEnemy();
      })
    )
  }

  fetchEnemy(){
    this.toDeleteSubscription.push(
      this.playedGameService.getEnemiesToFightWith(this.requestStructure.game!.id, this.requestStructure.player!.login).subscribe( (data: EnemyCardList) => {
        this.cardDisplayCondition = true;
        this.cardAttributes.push(data.enemyCardList[0].health);
        this.cardAttributes.push(data.enemyCardList[0].initialStrength);
        this.handleEnemyCard(data.enemyCardList[0]);
      })
    )
  }

  handleEnemyCard(data: EnemyCard){
    this.toDeleteSubscription.push(
      this.engineService.getCard(data.id).subscribe( (data: EngineCard) => {
        this.cardToDisplay = data;
        this.cardFightCondition.emit(true); // show Roll Die Button in Parent Component
      })
    );
  }

  fightEnemyFromField(){
    this.playerRoll = this.dieData.rollValue;
    this.toDeleteSubscription.push(
      this.playedGameService.rollDice(this.requestStructure.game!.id, this.requestStructure.player!.login).subscribe( (data: number) => {
        this.enemyRoll = data;
        this.handleFightEnemyField();
      })
    )
  }

  handleFightEnemyField(){
    this.toDeleteSubscription.push(
      this.playedGameService.handleFightWithEnemyCard(
        this.requestStructure.game!.id,
        this.requestStructure.player!.login,
        this.cardToDisplay.id,
      ).subscribe( (data: FightResult) => {
        this.fightResult = data;
        this.reset();
        this.fightResultCondition = true;
        if(!this.bossRoomFlag && !this.fightResult.attackerWon){
          this.finishCondition = true;
          this.finishConditionChange.emit(this.finishCondition);
        }
        this.shared.sendRefreshCharacterStatsEvent();
        this.shared.sendRefreshHandCardsEvent();
      })
    )
  }

  goToBoss(){
    this.toDeleteSubscription.push(
      this.playedGameService.changeFieldPositionOfCharacter(
        this.requestStructure.game!.id,
        this.requestStructure.player!.login,
        this.requestStructure.bossFieldId!
      ).subscribe( () => {
        this.reset()
        this.finishCondition = true;
        this.finishConditionChange.emit(this.finishCondition);
      })
    )
  }

  goToBridge(){
    this.toDeleteSubscription.push(
      this.playedGameService.changeFieldPositionOfCharacter(
        this.requestStructure.game!.id,
        this.requestStructure.player!.login,
        this.requestStructure.bridgeFieldId!
      ).subscribe( () => {
        this.reset()
        this.finishCondition = true;
        this.finishConditionChange.emit(this.finishCondition);
      })
    )
  }

  stayOnBoss(){
    this.reset()
    this.finishCondition = true;
    this.finishConditionChange.emit(this.finishCondition);
  }

  reset(){
    this.fightResultCondition = false;
    this.showFightEnemyCard = false;
    this.dieData = {fightEnemyCondition: false, rollValue: 0};
  }

  ngOnDestroy(): void {
    this.toDeleteSubscription.forEach( (s: Subscription) => {
      s.unsubscribe();
    });
  }
}
