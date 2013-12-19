#
# Copyright (c) 2013, Joyent, Inc. All rights reserved.
#

#
# Tools
#
NODEUNIT	:= ./node_modules/.bin/nodeunit
NPM		:= npm

#
# Files
#
DOC_FILES	 = index.restdown
JS_FILES	:= $(shell find lib test -name '*.js')
JSON_FILES	 = package.json
JSL_CONF_NODE	 = tools/jsl.node.conf
JSL_FILES_NODE	 = $(JS_FILES)
JSSTYLE_FILES	 = $(JS_FILES)
JSSTYLE_FLAGS	 = -f tools/jsstyle.conf
SMF_MANIFESTS_IN = smf/manifests/portmap.xml.in

include ./tools/mk/Makefile.defs
include ./tools/mk/Makefile.smf.defs

#
# Repo-specific targets
#
.PHONY: all
all: $(SMF_MANIFESTS) | $(NODEUNIT) $(REPO_DEPS)
	$(NPM) rebuild

$(NODEUNIT): | $(NPM_EXEC)
	$(NPM) install

CLEAN_FILES += $(NODEUNIT) ./node_modules/nodeunit node_modules

.PHONY: test
test: $(NODEUNIT)
	$(NPM) test

include ./tools/mk/Makefile.deps
include ./tools/mk/Makefile.smf.targ
include ./tools/mk/Makefile.targ
