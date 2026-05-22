-- CreateIndex (unique)
CREATE UNIQUE INDEX "Organization_name_key" ON "Organization"("name");

-- CreateIndex (unique)
CREATE UNIQUE INDEX "PicoCode_picoId_codeSystem_code_element_key" ON "PicoCode"("picoId", "codeSystem", "code", "element");

-- CreateIndex (unique)
CREATE UNIQUE INDEX "EtdJudgment_etdFactorId_interventionLabel_key" ON "EtdJudgment"("etdFactorId", "interventionLabel");

-- CreateIndex (unique)
CREATE UNIQUE INDEX "EmrElement_recommendationId_codeSystem_code_elementType_key" ON "EmrElement"("recommendationId", "codeSystem", "code", "elementType");

-- CreateIndex (unique)
CREATE UNIQUE INDEX "CoiInterventionConflict_coiRecordId_interventionLabel_key" ON "CoiInterventionConflict"("coiRecordId", "interventionLabel");
