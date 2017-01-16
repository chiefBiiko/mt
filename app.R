library(shiny)
library(shinyjs)
library(miniUI)
source('https://raw.githubusercontent.com/chiefBiiko/mt/master/mt.R')
# TODO: progress bar for mt$read(), its slow..
#       put correct colnames on return matrix
mtInit <- function(inputValue1, inputValue2) {  # not using these
  # --------------------------------------------------------------------------
  ui <- miniPage(
    useShinyjs(),
    tags$head(  # http://stackoverflow.com/questions/24973549/r-shiny-key-input-binding
      tags$script('
        $(document).on("keydown", function(e) {
          Shiny.onInputChange("keyz", e.which);
        });
      ')
    ),
    gadgetTitleBar(strong('mt')),
    miniContentPanel(
      textInput('line', 'Enter URLs', '', '100%', 'http://... and https://...'),
      hidden(htmlOutput('mirror')),
      hidden(div(id='reset-blk',
        actionLink('clearall', 'clear all'), span(' : '),
        actionLink('clearlast', 'clear last'), br(), br()
      )),
      checkboxGroupInput('checks', 'Choose meta info to get', 
                         choices = list("Title"=1, "Description"=2, "Keywords"=3),
                         selected = c(1, 2, 3)
      ),
      miniButtonBlock(hidden(actionLink('submit', strong('Get info for given URLs!')))), br(),
      hidden(div(id='busy', em('R is busy, be patient...'))),
      hidden(div(id='data',
        p(strong('Return data')),
        actionLink('view', 'View'), br(),
        actionLink('save', 'Save .csv'),
        hidden(span(id='savemsg', ' >> saved in current working directory')), br(), br()
      ))
    )
  )
  # --------------------------------------------------------------------------
  server <- function(input, output, session) {  # input$checks
    store <- reactiveValues(uris=character(), cnvt=character(),
                            params=character(), mrx=matrix())
    # event listener 4 js keydown, updating store$uris
    observeEvent(input$keyz, {
      if (input$keyz == 13 & grepl('^https?://[^\\.]+\\..{2,}', input$line)) {
        hide('data')
        store$uris[length(store$uris)+1] <- trimws(input$line)
        updateTextInput(session, 'line', NULL, '')
        lapply(list('mirror', 'reset-blk', 'submit'), show)
      }
    })
    # clear all btn
    observeEvent(input$clearall, {
      store$uris <- character()
      lapply(list('mirror', 'reset-blk', 'submit'), hide)
    })
    # clear last btn
    observeEvent(input$clearlast, { store$uris <- store$uris[-length(store$uris)] })
    # done btn
    observeEvent(input$done, { stopApp({store$mrx}) })  # return value
    # reflects valid input uris
    output$mirror <- renderUI({  # let only store$uris update ui #mirror
      store$cnvt <- sapply(store$uris, function(x) { paste0(x, '<br/>') })
      HTML(paste0(store$cnvt))
    })
    # submit btn and returning
    observeEvent(input$submit, {
      show('busy')
      store$params <- c('1' %in% input$checks, '2' %in% input$checks, '3' %in% input$checks)
      store$mrx <- mt$read(store$uris, store$params[1], store$params[2], store$params[3])
      lapply(list('mirror', 'reset-blk', 'submit', 'busy'), hide)
      show('data')
      store$uris <- character()  # keeping things dry
      mt.data <<- store$mrx
    })
    # view btn
    observeEvent(input$view, { View(store$mrx) })
    # save btn
    observeEvent(input$save, {
      fn <- paste0('mt', as.integer(Sys.time()), '.csv')
      write.csv(store$mrx, fn)
      show('savemsg')
    }) 
  }
  # --------------------------------------------------------------------------
  runGadget(ui, server, viewer=dialogViewer('mt - get meta info from webpages'))
}
# --------------------------------------------------------------------------
mtInit()