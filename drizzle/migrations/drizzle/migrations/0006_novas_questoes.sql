-- Lote de Legislação Penal Especial (Padrão Cesgranrio / Concursos Policiais)

INSERT INTO public.questions (materia, topico, enunciado, alternativas, correta, explicacao) VALUES
-- 1. Lei de Abuso de Autoridade (Lei nº 13.869/2019)
(
  'Direito Penal e Legislação Penal Especial',
  'Lei de Abuso de Autoridade (Lei nº 13.869/2019)',
  'Durante o cumprimento de mandado de busca e apreensão devidamente autorizado pelo juízo competente, um delegado de polícia adentra o imóvel às 4h30 da manhã, antes do amanhecer, sob a alegação de conveniência operacional. Conforme a Lei nº 13.869/2019, essa conduta:',
  ARRAY[
    'É atípica, pois a autoridade estava munida de mandado judicial de busca e apreensão válido.',
    'Configura crime de abuso de autoridade por cumprir mandado de busca e apreensão domiciliar entre as 21h e as 5h.',
    'Constitui mera infração disciplinar perante a Corregedoria, não alcançando a esfera penal.',
    'É lícita, desde que acompanhada de duas testemunhas do povo que comprovem a integridade do ato.',
    'Depende de representação formal exclusiva do Ministério Público para ter tipicidade penal.'
  ],
  1,
  'O art. 22, § 1º, III, da Lei nº 13.869/2019 tipifica expressamente como crime de abuso de autoridade cumprir mandado de busca e apreensão domiciliar após as 21h ou antes das 5h.'
),

-- 2. Estatuto do Desarmamento (Lei nº 10.826/2003)
(
  'Direito Penal e Legislação Penal Especial',
  'Estatuto do Desarmamento (Lei nº 10.826/2003)',
  'Durante patrulhamento de rotina, policiais civis abordam um indivíduo que transportava, sob o banco do veículo, um revólver calibre .38 com numeração raspada, desmuniciado, e sem que ele possuísse munições consigo. Diante da jurisprudência consolidada do Superior Tribunal de Justiça (STJ), a conduta do agente:',
  ARRAY[
    'É atípica em razão da ausência de munição, caracterizando crime impossível pela ineficácia absoluta do meio.',
    'Configura porte ilegal de arma de fogo de uso restrito, sendo irrelevante o fato de a arma estar desmuniciada por se tratar de crime de perigo abstrato.',
    'Configura mera contravenção penal por não haver comprovação pericial de lesividade imediata.',
    'Equipara-se a posse irregular de arma de fogo de uso permitido, admitindo fiança em sede policial.',
    'Admite o reconhecimento da insignificância penal desde que o agente seja primário.'
  ],
  1,
  'O porte de arma de fogo de numeração suprimida/raspada é crime de perigo abstrato (art. 16, § 1º, IV, da Lei 10.826/03), sendo irrelevante estar desmuniciada ou desmontada para a configuração típica, segundo a jurisprudência pacífica do STJ e STF.'
),

-- 3. Lei de Drogas (Lei nº 11.343/2006)
(
  'Direito Penal e Legislação Penal Especial',
  'Lei de Drogas (Lei nº 11.343/2006)',
  'Um indivíduo primário, com bons antecedentes e sem vínculo com organização criminosa, adquire substância entorpecente para consumo pessoal compartilhado com amigo íntimo, sem objetivo de lucro e em local reservado. Conforme o art. 33, § 3º, da Lei nº 11.343/2006, essa conduta:',
  ARRAY[
    'Equipara-se ao tráfico privilegiado de drogas, sujeito a pena de reclusão com redução de um sexto a dois terços.',
    'Configura o tipo especial de tráfico compartilhado, apenado com detenção de 6 meses a 1 ano, além de multa.',
    'É atípica, pois a ausência de lucro descaracteriza qualquer infração penal na Lei de Drogas.',
    'Submete o agente unicamente às medidas educativas e advertência previstas para o usuário no art. 28.',
    'Exige obrigatoriamente a decretação de prisão preventiva inafiançável pela autoridade judiciária.'
  ],
  1,
  'Oferecer droga eventualmente e sem objetivo de lucro a pessoa do seu relacionamento, para juntos consumirem, tipifica o art. 33, § 3º, apenado com detenção de 6 meses a 1 ano e multa, infração de menor potencial ofensivo.'
),

-- 4. Crimes Hediondos (Lei nº 8.072/1990)
(
  'Direito Penal e Legislação Penal Especial',
  'Lei de Crimes Hediondos (Lei nº 8.072/1990)',
  'Com as alterações introduzidas pelo Pacote Anticrime (Lei nº 13.964/2019) no rol da Lei nº 8.072/1990, passou a ser expressamente classificado como crime hediondo:',
  ARRAY[
    'O furto simples qualificado pela destreza ou fraude.',
    'O furto qualificado pelo emprego de explosivo ou de artefato análogo que cause perigo comum.',
    'A concussão cometida por servidor público no exercício de função de segurança.',
    'A apropriação indébita previdenciária de elevado valor econômico.',
    'O roubo praticado sem uso de arma, mas com concurso de duas ou mais pessoas.'
  ],
  1,
  'O Pacote Anticrime inseriu no art. 1º, inciso IX, da Lei nº 8.072/90 o "furto qualificado pelo emprego de explosivo ou de artefato análogo que cause perigo comum (art. 155, § 4º-A)" como crime hediondo.'
),

-- 5. Lei Maria da Penha (Lei nº 11.340/2006)
(
  'Direito Penal e Legislação Penal Especial',
  'Lei Maria da Penha (Lei nº 11.340/2006)',
  'Nos casos de violência doméstica e familiar contra a mulher previstos na Lei nº 11.340/2006, em relação à aplicação da Lei dos Juizados Especiais Criminais (Lei nº 9.099/1995) e concessão de benefícios despenalizadores, o ordenamento jurídico e a jurisprudência sumulada do STJ determinam que:',
  ARRAY[
    'É vedada expressamente a aplicação da Lei nº 9.099/1995 e inadmissível a aplicação do princípio da insignificância.',
    'Permite-se a transação penal e a suspensão condicional do processo, vedada apenas a aplicação de penas de cesta básica.',
    'Aplica-se o princípio da bagatela imprópria caso haja reconciliação espontânea entre o casal antes da sentença.',
    'A autoridade policial pode homologar acordo de não persecução cível diretamente na delegacia.',
    'Admite-se a substituição da pena privativa de liberdade por prestação pecuniária à entidade filantrópica.'
  ],
  0,
  'O art. 41 da Lei 11.340/06 veda a incidência da Lei 9.099/95. Além disso, as Súmulas 589 ("é inaplicável o princípio da insignificância") e 536 do STJ proíbem institutos despenalizadores em contexto de violência doméstica contra a mulher.'
),

-- 6. Lei de Tortura (Lei nº 9.455/1997)
(
  'Direito Penal e Legislação Penal Especial',
  'Lei de Tortura (Lei nº 9.455/1997)',
  'Um agente policial, ao presenciar outro colega submetendo um preso sob sua guarda a intenso sofrimento físico para obter confissão de delito, omite-se dolosamente sem tomar providências para fazer cessar a conduta. Nos termos da Lei nº 9.455/1997, o policial que se omitiu:',
  ARRAY[
    'Responde como coautor da tortura-prova nas mesmas penas de reclusão previstas no caput.',
    'Comete o crime de tortura por omissão, punível com pena mais branda (detenção de 1 a 4 anos).',
    'Responde apenas por condescendência criminosa ou prevaricação no âmbito administrativo.',
    'Fica isento de pena caso não tenha participado diretamente da agressão física.',
    'Responde por prevaricação cumulada com lesão corporal de natureza leve.'
  ],
  1,
  'O art. 1º, § 2º, da Lei nº 9.455/1997 estabelece que aquele que se omite em face dessas condutas, quando tinha o dever de evitá-las ou apurá-las, incorre na pena de detenção de 1 a 4 anos (tortura imprópria ou por omissão).'
),

-- 7. Organizações Criminosas (Lei nº 12.850/2013)
(
  'Direito Penal e Legislação Penal Especial',
  'Organizações Criminosas (Lei nº 12.850/2013)',
  'Para a caracterização legal de organização criminosa nos termos do art. 1º, § 1º, da Lei nº 12.850/2013, exige-se a associação estruturalmente ordenada de:',
  ARRAY[
    'No mínimo 3 pessoas, voltada à prática de qualquer crime apenado com reclusão.',
    '4 ou mais pessoas, com divisão de tarefas, destinada à prática de infrações com penas máximas superiores a 4 anos ou de caráter transnacional.',
    'Pelo menos 5 agentes, independentemente da pena máxima cominada aos delitos visados.',
    '2 ou mais pessoas com hierarquia armada permanente, prescindindo de transnacionalidade.',
    'Qualquer número de participantes, desde que haja atuação com poder de intimidação social.'
  ],
  1,
  'O conceito do art. 1º, § 1º, da Lei 12.850/13 exige a associação de 4 (quatro) ou mais pessoas, estruturalmente ordenada e caracterizada pela divisão de tarefas, com objetivo de cometer infrações cujas penas máximas sejam superiores a 4 anos ou de caráter transnacional.'
),

-- 8. Interceptação Telefônica (Lei nº 9.296/1996)
(
  'Direito Penal e Legislação Penal Especial',
  'Interceptação Telefônica (Lei nº 9.296/1996)',
  'A interceptação de comunicações telefônicas, disciplinada pela Lei nº 9.296/1996 e pela jurisprudência dos tribunais superiores, NÃO poderá ser admitida quando:',
  ARRAY[
    'A apuração envolver crime praticado por organização criminosa armada.',
    'Houver indícios razoáveis de autoria ou participação na infração penal investigada.',
    'O fato investigado constituir infração penal punida, no máximo, com pena de detenção.',
    'A prova não puder ser produzida eficazmente por outros meios disponíveis.',
    'O pedido for formulado motivadamente pela autoridade policial na fase de inquérito.'
  ],
  2,
  'Conforme o art. 2º, III, da Lei nº 9.296/1996, não será admitida a interceptação quando o fato investigado constituir infração punida, no máximo, com pena de detenção (exige-se reclusão).'
)
ON CONFLICT (materia, enunciado) DO NOTHING;
-- Lote de Legislação Penal Especial - Parte 2 (Padrão Cesgranrio)

INSERT INTO public.questions (materia, topico, enunciado, alternativas, correta, explicacao) VALUES
-- 1. Lei de Lavagem de Capitais (Lei nº 9.613/1998)
(
  'Direito Penal e Legislação Penal Especial',
  'Lavagem de Capitais (Lei nº 9.613/1998)',
  'Com a revogação do rol taxativo de crimes antecedentes pela Lei nº 12.683/2012, a configuração do crime de lavagem ou ocultação de bens, direitos e valores (Lei nº 9.613/1998) exige que a infração antecedente seja:',
  ARRAY[
    'Exclusivamente um crime praticado por organização criminosa armada ou tráfico de drogas.',
    'Qualquer crime ou contravenção penal que tenha produzido proveito ou produto econômico ilícito.',
    'Apenas crimes apenados com reclusão e que tenham gerado dano direto ao erário público.',
    'Exclusivamente crimes contra a administração pública ou contra o sistema financeiro nacional.',
    'Infrações penais dolosas cuja denúncia já tenha sido recebida e instruída em juízo.'
  ],
  1,
  'A Lei nº 12.683/2012 adotou a terceira geração de leis de lavagem: qualquer infração penal (crime ou contravenção penal, como o jogo do bicho) pode figurar como antecedente do delito de lavagem de dinheiro (art. 1º, caput).'
),

-- 2. Estatuto da Criança e do Adolescente (Lei nº 8.069/1990)
(
  'Direito Penal e Legislação Penal Especial',
  'Estatuto da Criança e do Adolescente (Lei nº 8.069/1990)',
  'A respeito do crime de corrupção de menores previsto no art. 244-B do ECA ("Corromper ou facilitar a corrupção de menor de 18 anos, com ele praticando infração penal ou induzindo-o a praticá-la"), a Súmula 500 do Superior Tribunal de Justiça (STJ) pacificou o entendimento de que:',
  ARRAY[
    'Trata-se de crime material, indispensável a demonstração técnica de que a conduta degradou moralmente a vítima.',
    'É crime formal, cuja caracterização independe de prova da efetiva e posterior corrupção do menor.',
    'Exige-se que o menor nunca tenha praticado ato infracional anterior para que o tipo se configure.',
    'Admite-se a tentativa apenas quando a infração penal associada for tentada.',
    'Aplica-se o perdão judicial quando houver laço de parentesco consanguíneo entre os envolvidos.'
  ],
  1,
  'A Súmula 500 do STJ dispõe expressamente: "A configuração do crime do art. 244-B do ECA independe da prova da efetiva corrupção do menor, por se tratar de delito formal."'
),

-- 3. Código de Trânsito Brasileiro (Lei nº 9.503/1997)
(
  'Direito Penal e Legislação Penal Especial',
  'Código de Trânsito Brasileiro (Lei nº 9.503/1997)',
  'Um motorista conduz veículo automotor com a capacidade psicomotora alterada em razão da influência de álcool, sendo abordado por policiais. Diante das previsões do art. 306 do CTB e da jurisprudência dominante, é correto afirmar que o crime de embriaguez ao volante:',
  ARRAY[
    'É de perigo concreto, exigindo demonstração de que o condutor realizou manobras anormais geradoras de risco.',
    'É de perigo abstrato, consumando-se com a mera condução sob influência nos limites legais, dispensada direção perigosa concreta.',
    'Admite comprovação de alteração psicomotora exclusivamente mediante teste do etilômetro (bafômetro).',
    'Exige a ocorrência de lesão corporal ou colisão material com outro veículo para que haja ação penal.',
    'Constitui infração de trânsito meramente administrativa quando não há transeuntes na via pública.'
  ],
  1,
  'O crime de embriaguez ao volante (art. 306 do CTB) é de perigo abstrato (independe de prova de direção perigosa ou manobras arriscadas concretas). A alteração pode ser constatada por etilômetro, exame clínico, testemunhas, vídeos ou outros meios em direito admitidos.'
),

-- 4. Crimes Ambientais (Lei nº 9.605/1998)
(
  'Direito Penal e Legislação Penal Especial',
  'Lei de Crimes Ambientais (Lei nº 9.605/1998)',
  'No que tange à responsabilização penal das pessoas jurídicas por crimes contra o meio ambiente (art. 225, § 3º, da CF/88 e Lei nº 9.605/1998), a jurisprudência pacífica do STF e do STJ estabelece que:',
  ARRAY[
    'A responsabilização da pessoa jurídica é condicionada obrigatoriamente à condenação simultânea da pessoa física (teoria da dupla imputação).',
    'É admissível a responsabilização penal da pessoa jurídica mesmo desacompanhada da acusação simultânea da pessoa física atuante (superação da teoria da dupla imputação).',
    'Pessoas jurídicas de direito público não podem sofrer qualquer tipo de sanção restritiva de direitos.',
    'A pena privativa de liberdade dos sócios pode ser convertida automaticamente em liquidação forçada da empresa.',
    'As sanções penais a pessoas jurídicas aplicam-se exclusivamente quando a conduta decorre de culpa contra a legalidade.'
  ],
  1,
  'O STF e o STJ superaram a teoria da dupla imputação. Hoje vigora o entendimento de que a pessoa jurídica pode ser processada e condenada autonomamente por crimes ambientais, sem necessidade de imputação conjunta da pessoa física.'
),

-- 5. Lei de Drogas - Causas de Aumento (Lei nº 11.343/2006)
(
  'Direito Penal e Legislação Penal Especial',
  'Lei de Drogas (Lei nº 11.343/2006)',
  'Para a incidência da causa especial de aumento de pena relativa ao tráfico interestadual de drogas (art. 40, inciso V, da Lei nº 11.343/2006), a Súmula 587 do STJ consolidou que:',
  ARRAY[
    'É indispensável a efetiva transposição da divisa interestadual pelo agente ou pela substância entorpecente.',
    'Exige-se a apreensão da droga em território do Estado destinatário da mercadoria ilícita.',
    'É desnecessária a efetiva transposição da fronteira interestadual, bastando a demonstração inequívoca da intenção de realizar o transporte interestadual.',
    'Aplica-se o aumento apenas se o agente estiver associado a organização criminosa com atuação em mais de dois Estados.',
    'O aumento é incompatível com o reconhecimento do tráfico privilegiado (art. 33, § 4º).'
  ],
  2,
  'A Súmula 587 do STJ dispõe expressamente: "Para a incidência da majorante prevista no art. 40, V, da Lei n. 11.343/2006, é desnecessária a efetiva transposição de fronteiras entre Estados da Federação, sendo suficiente a demonstração inequívoca da intenção de realizar o tráfico interestadual."'
),

-- 6. Lei de Execução Penal (Lei nº 7.210/1984)
(
  'Direito Penal e Legislação Penal Especial',
  'Lei de Execução Penal (Lei nº 7.210/1984)',
  'A posse, utilização ou fornecimento de aparelho telefônico de comunicação móvel (celular) ou similar por pessoa presa em estabelecimento prisional configura, nos termos da Lei de Execução Penal (LEP):',
  ARRAY[
    'Mera falta disciplinar leve, punível com advertência verbal pela direção do presídio.',
    'Falta disciplinar grave expressamente tipificada no art. 50, inciso VII, da Lei de Execução Penal.',
    'Crime autônomo inafiançável apenado com reclusão de 2 a 4 anos para o custodiado.',
    'Conduta atípica caso o aparelho esteja descarregado ou sem chip de operadora.',
    'Infração média que impede apenas as visitas íntimas nos 30 dias subsequentes.'
  ],
  1,
  'O art. 50, VII, da LEP (incluído pela Lei nº 11.466/2007) classifica expressamente como falta disciplinar de natureza grave o fato de o preso ter em sua posse, utilizar ou fornecer aparelho telefônico, de rádio ou similar que permita a comunicação com o ambiente externo.'
)
ON CONFLICT (materia, enunciado) DO NOTHING;
