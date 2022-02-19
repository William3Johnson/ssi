import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmSQLiteModule } from '../../in-memory-db';
import { Repository } from 'typeorm';
import { VcApiService } from '../vc-api.service';
import { ExchangeExecutionEntity } from './entities/exchange-execution.entity';
import { VpRequestEntity } from './entities/vp-request.entity';
import { ExchangeService } from './exchange.service';
import { ExchangeDefinitionDto } from './dtos/exchange-definition.dto';
import { VpRequestInteractServiceType } from './types/vp-request-interact-service-type';
import { ExchangeTransactionEntity } from './entities/exchange-transaction.entity';
import { VpRequestQueryType } from './types/vp-request-query-type';

describe('ExchangeService', () => {
  let service: ExchangeService;
  let vcApiService: VcApiService;
  let activeFlowRepository: Repository<ExchangeExecutionEntity>;
  let vpRequestRepository: Repository<VpRequestEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmSQLiteModule(),
        TypeOrmModule.forFeature([VpRequestEntity, ExchangeExecutionEntity, ExchangeTransactionEntity])
      ],
      providers: [
        ExchangeService,
        {
          provide: VcApiService,
          useValue: {}
        }
      ]
    }).compile();

    vcApiService = module.get<VcApiService>(VcApiService);
    service = module.get<ExchangeService>(ExchangeService);
    activeFlowRepository = module.get<Repository<ExchangeExecutionEntity>>(
      getRepositoryToken(ExchangeExecutionEntity)
    );
    vpRequestRepository = module.get<Repository<VpRequestEntity>>(getRepositoryToken(VpRequestEntity));
  });

  afterEach(async () => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('configure exchange', () => {
    it('should accept a presentation definition in an exchange definition', async () => {
      const presentationDefinition = {
        id: '57ca126c-acbf-4da4-8f79-447150e93128',
        input_descriptors: [
          {
            id: 'permanent_resident_card',
            name: 'Permanent Resident Card',
            purpose: 'We can only allow permanent residents into the application'
          }
        ]
      };
      const exchangeDef = {
        exchangeId: 'permanent-resident-card-presentation',
        query: [
          {
            type: VpRequestQueryType.presentationDefinition,
            credentialQuery: [presentationDefinition]
          }
        ],
        interactServices: [
          {
            type: VpRequestInteractServiceType.unmediatedPresentation,
            baseUrl: 'https://example.org/'
          }
        ]
      };
      const result = service.configureExchange(exchangeDef);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('start exchange', () => {
    it('should start exchange from an exchange definition', async () => {
      const exchangeId = 'test-exchange';
      const baseUrl = 'https://test-issuer.com';
      const exchangeDef: ExchangeDefinitionDto = {
        exchangeId: exchangeId,
        interactServices: [
          {
            type: VpRequestInteractServiceType.unmediatedPresentation,
            baseUrl
          }
        ],
        query: []
      };
      service.configureExchange(exchangeDef);
      const exchangeResponse = await service.startExchange(exchangeId);
      expect(exchangeResponse.vpRequest.interact.service).toHaveLength(1);
      expect(exchangeResponse.vpRequest.interact.service[0].serviceEndpoint).toContain(baseUrl);
    });
  });
});
