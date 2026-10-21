-- Lote de questões inéditas no padrão Fundação Cesgranrio para todas as disciplinas

INSERT INTO public.questions (materia, topico, enunciado, alternativas, correta, explicacao) VALUES
-- 1. Língua Portuguesa
(
  'Língua Portuguesa',
  'Concordância Verbal e Nominal',
  'Considere a frase: "Constatou-se, durante a apuração dos indícios pela equipe pericial, que haviam divergências nos depoimentos prestados." De acordo com a norma-padrão da língua portuguesa, o verbo "haver" deveria ser flexionado ou mantido de qual forma?',
  ARRAY[
    'Deveria ser mantido no plural ("haviam"), pois concorda com o sujeito posposto "divergências".',
    'Deveria ser substituído por "havia", pois o verbo "haver", no sentido de existir ou ocorrer, é impessoal e fica na 3ª pessoa do singular.',
    'Deveria ser substituído por "teriam", pois a locução exige concordância facultativa.',
    'Deveria ser alterado para "houveram", permanecendo no plural devido à presença do adjunto adverbial.',
    'Está correto no plural, admitindo dupla regência conforme a banca Cesgranrio.'
  ],
  1,
  'O verbo "haver" no sentido de existir ou acontecer é impessoal (não possui sujeito) e deve permanecer obrigatoriamente na 3ª pessoa do singular: "que havia divergências".'
),
-- 2. Raciocínio Lógico-Matemático
(
  'Raciocínio Lógico-Matemático',
  'Equivalências Lógicas',
  'Um investigador registrou a seguinte proposição condicional: "Se o suspeito estava no local do crime, então ele teve acesso ao cofre." A negação lógica dessa afirmação é expressa por:',
  ARRAY[
    'Se o suspeito não estava no local do crime, então ele não teve acesso ao cofre.',
    'O suspeito não estava no local do crime e não teve acesso ao cofre.',
    'O suspeito estava no local do crime e não teve acesso ao cofre.',
    'Se o suspeito teve acesso ao cofre, então estava no local do crime.',
    'O suspeito não estava no local do crime ou teve acesso ao cofre.'
  ],
  2,
  'A negação de uma condicional "Se P, então Q" segue a regra "mantém a primeira E nega a segunda" [P ^ ~Q]: "O suspeito estava no local do crime e não teve acesso ao cofre".'
),
-- 3. Noções de Informática
(
  'Noções de Informática',
  'Segurança da Informação e Criptografia',
  'Ao analisar evidências digitais, a equipe pericial utiliza o algoritmo SHA-256 para gerar um resumo criptográfico de uma imagem de disco. A finalidade precípua do uso desse algoritmo é assegurar a:',
  ARRAY[
    'Confidencialidade das informações armazenadas contra acessos externos.',
    'Disponibilidade ininterrupta do arquivo durante a custódia policial.',
    'Integridade da evidência, comprovando que os dados não foram alterados.',
    'Compactação dos arquivos para facilitar a transferência por rede.',
    'Recuperação automática de setores corrompidos da mídia física.'
  ],
  2,
  'Funções hash criptográficas (como SHA-256 e MD5) geram resumos digitais unívocos utilizados para garantir e auditar a integridade das evidências.'
),
-- 4. Noções de Estatística e Análise de Dados
(
  'Noções de Estatística e Análise de Dados',
  'Medidas de Tendência Central',
  'Em um levantamento sobre ocorrências de roubo em 5 delegacias, os números registrados foram: 12, 14, 18, 18 e 48. Qual é, respectivamente, a mediana e a moda dessa distribuição?',
  ARRAY[
    '18 e 18.',
    '14 e 18.',
    '22 e 18.',
    '18 e 14.',
    '14 e 12.'
  ],
  0,
  'Com os dados ordenados [12, 14, 18, 18, 48], o elemento central (mediana) é 18. O valor com maior frequência absoluta (moda) é 18.'
),
-- 5. Noções de Contabilidade e Análise Financeira
(
  'Noções de Contabilidade e Análise Financeira',
  'Balanço Patrimonial e Fatos Contábeis',
  'A aquisição de viaturas policiais à vista mediante pagamento bancário representa para a entidade um fato contábil:',
  ARRAY[
    'Modificativo diminutivo, pois reduziu as disponibilidades da conta bancária.',
    'Modificativo aumentativo, em razão do ingresso de novos bens no ativo não circulante.',
    'Permutativo ou compensativo, pois houve troca de ativos sem alteração no patrimônio líquido.',
    'Misto aumentativo, pois combina aumento patrimonial com entrada de imobilizado.',
    'Misto diminutivo, devido ao desembolso imediato de recursos.'
  ],
  2,
  'A compra de ativo imobilizado à vista é um fato permutativo entre contas do ativo (sai Banco/Caixa e entra Imobilizado), sem alterar o valor total do Patrimônio Líquido.'
),
-- 6. Direito Constitucional
(
  'Direito Constitucional',
  'Direitos e Garantias Fundamentais',
  'De acordo com o art. 5º da Constituição Federal de 1988 e a jurisprudência do STF, a violação de domicílio durante a noite é constitucionalmente admitida nas seguintes hipóteses:',
  ARRAY[
    'Apenas mediante consentimento do morador ou ordem judicial expedida por juiz competente.',
    'Em caso de flagrante delito, desastre, ou para prestar socorro, dispensada autorização judicial.',
    'Por determinação de autoridade policial para cumprimento de mandado de busca e apreensão.',
    'Apenas durante o dia em caso de flagrante delito, sendo vedada qualquer entrada noturna.',
    'Mediante decisão fundamentada do Ministério Público para apuração de crime inafiançável.'
  ],
  1,
  'A casa é asilo inviolável, admitindo entrada noturna sem consentimento apenas em flagrante delito, desastre ou para prestar socorro (art. 5º, XI, CF/88). Determinação judicial só permite entrada durante o dia.'
),
-- 7. Direito Administrativo
(
  'Direito Administrativo',
  'Poderes Administrativos e Poder de Polícia',
  'A interdição de um estabelecimento comercial que opera sem condições sanitárias adequadas, realizada de ofício pela fiscalização sem prévia autorização judicial, decorre diretamente do atributo do poder de polícia denominado:',
  ARRAY[
    'Tipicidade.',
    'Autoexecutoriedade.',
    'Discricionariedade absoluta.',
    'Imperatividade mitigada.',
    'Presunção relativa de culpabilidade.'
  ],
  1,
  'A autoexecutoriedade permite à Administração Pública executar suas decisões materiais diretamente, sem necessidade de prévia autorização judicial, especialmente em situações de risco ou urgência.'
),
-- 8. Direito Penal e Legislação Penal Especial
(
  'Direito Penal e Legislação Penal Especial',
  'Crimes contra a Administração Pública',
  'O funcionário público que exige, para si ou para outrem, direta ou indiretamente, em razão da função, vantagem indevida, pratica o crime de:',
  ARRAY[
    'Corrupção passiva.',
    'Peculato-apropriação.',
    'Concussão.',
    'Prevaricação.',
    'Advocacia administrativa.'
  ],
  2,
  'O verbo "exigir" configura o crime de concussão (art. 316 do Código Penal). Se o agente "solicitar", "receber" ou "aceitar promessa", o crime será corrupção passiva (art. 317).'
),
-- 9. Direito Processual Penal
(
  'Direito Processual Penal',
  'Inquérito Policial',
  'A respeito das características do Inquérito Policial segundo o Código de Processo Penal e a doutrina majoritária, é correto afirmar que o inquérito é um procedimento:',
  ARRAY[
    'Judicial, contraditório e indispensável para o ajuizamento da ação penal.',
    'Administrativo, inquisitorial, sigiloso, escrito e indisponível para a autoridade policial.',
    'Público em sua totalidade, permitindo livre acesso de terceiros aos autos antes do relatório final.',
    'Disponível, podendo o delegado de polícia determinar seu arquivamento quando não houver autoria.',
    'Obrigatório em todas as infrações penais, sob pena de nulidade absoluta da denúncia.'
  ],
  1,
  'O IP é administrativo, inquisitivo (sem contraditório pleno), sigiloso, escrito e a autoridade policial jamais pode mandar arquivar autos de inquérito (art. 17 do CPP).'
),
-- 10. Direitos Humanos
(
  'Direitos Humanos',
  'Pacto de San José da Costa Rica',
  'Nos termos da Convenção Americana sobre Direitos Humanos (Pacto de San José da Costa Rica) e da Súmula Vinculante 25 do STF, é ilícita a prisão civil:',
  ARRAY[
    'Do devedor de pensão alimentícia e do depositário infiel.',
    'Do depositário infiel, em qualquer modalidade contratual.',
    'Exclusivamente do falido em processo de recuperação judicial.',
    'Do condenado por crime hediondo antes do trânsito em julgado.',
    'Apenas quando imposta por autoridade administrativa.'
  ],
  1,
  'A Súmula Vinculante 25 do STF estabelece que "É ilícita a prisão civil de depositário infiel, qualquer que seja a modalidade do depósito", subsistindo no Brasil apenas a prisão do devedor de alimentos.'
),
-- 11. História e Geografia do Amapá / Legislação Institucional
(
  'História do Amapá, Geografia do Amapá e Legislação Institucional',
  'Criação do Território Federal do Amapá',
  'O Território Federal do Amapá foi desmembrado do Estado do Pará no contexto geopolítico da Segunda Guerra Mundial, durante o governo de Getúlio Vargas, no ano de:',
  ARRAY[
    '1930, pelo Decreto de Criação dos Territórios de Fronteira.',
    '1943, por meio do Decreto-Lei nº 5.812.',
    '1988, com a promulgação da Constituição Cidadã.',
    '1955, durante a interiorização da capital federal.',
    '1964, por determinação do regime militar.'
  ],
  1,
  'O Território Federal do Amapá foi criado em 13 de setembro de 1943 pelo Decreto-Lei nº 5.812, assinado pelo presidente Getúlio Vargas para proteção das fronteiras estratégicas.'
),
-- 12. Criminologia
(
  'Criminologia',
  'Teorias Sociológicas da Criminalidade',
  'A teoria criminológica segundo a qual o comportamento criminoso não é inato nem decorre de patologias individuais, mas sim é aprendido mediante interação e comunicação em grupos íntimos, denomina-se:',
  ARRAY[
    'Teoria da Anomia (Robert Merton).',
    'Teoria da Associação Diferencial (Edwin Sutherland).',
    'Teoria da Rotulação Social ou Labelling Approach.',
    'Teoria das Janelas Quebradas (Broken Windows).',
    'Teoria da Escolha Racional.'
  ],
  1,
  'A Teoria da Associação Diferencial, desenvolvida por Edwin Sutherland, preceitua que a conduta delitiva é aprendida no processo de comunicação e socialização em grupos pessoais íntimos.'
)
ON CONFLICT (materia, enunciado) DO NOTHING;
