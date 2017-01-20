library(shiny)
library(shinyjs)
library(miniUI)
require(jsonlite)
source('https://raw.githubusercontent.com/chiefBiiko/mt/master/mt.R')
# TODO: progress bar for mt$read(), its slow..
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
                         choices = list("Title"=1, "Description"=2, "Keywords"=3, "Schema"=4),
                         selected = c(1, 2, 3)
      ),
      miniButtonBlock(hidden(actionLink('submit', strong('Get info for given URLs!')))), br(),
      hidden(div(id='busy', em('R is busy, be patient...'))),
      hidden(div(id='data',
        p(strong('Return data')),
        p('Once you click "Done" all return data will be bound in your global environment.'),
        tags$ul(
          tags$li('mt.data$meta : matrix'),
          hidden(div(id='schmbull', tags$li('mt.data$schema : list')))
        ),
        actionLink('view', 'View meta matrix'), br(),
        actionLink('save', 'Save meta matrix as CSV'),
        hidden(span(id='savemsg', ' >> saved mtmeta...csv in current working directory')), br(),
        hidden(span(id='schm', actionLink('saveschm', 'Save schema list as JSON'),
        hidden(span(id='schmsg', ' >> saved mtschema...json in current working directory')), br())), br()
      ))
    )
  )
  # --------------------------------------------------------------------------
  server <- function(input, output, session) {  # input$checks
    store <- reactiveValues(uris=character(), cnvt=character(),
                            params=character(), data=list())
    # event listener 4 js keydown, updating store$uris
    observeEvent(input$keyz, {
      if (input$keyz == 13 & grepl('^https?://[^\\.]+\\..{2,}', input$line)) {
        hide('data')
        store$uris[length(store$uris)+1] <- trimws(input$line)
        updateTextInput(session, 'line', NULL, '')
        lapply(list('mirror', 'reset-blk', 'checks', 'submit'), show)
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
    observeEvent(input$done, { stopApp({store$data}) })  # return value
    # reflects valid input uris
    output$mirror <- renderUI({  # let only store$uris update ui #mirror
      store$cnvt <- sapply(store$uris, function(x) { paste0(x, '<br/>') })
      HTML(paste0(store$cnvt))
    })
    # submit btn and returning
    observeEvent(input$submit, {
      show('busy')
      store$params <- c('1' %in% input$checks, '2' %in% input$checks, '3' %in% input$checks, '4' %in% input$checks)
      store$data <- mt$read(store$uris, store$params[1], store$params[2], store$params[3], store$params[4])
      lapply(list('mirror', 'reset-blk', 'checks', 'submit', 'busy', 'schmbull', 'schm', 'savemsg', 'schmsg'), hide)
      show('data')
      if (store$params[4]) lapply(list('schmbull', 'schm'), show)
      store$uris <- store$cnvt <- store$params <- character()  # keeping things dry
      mt.data <<- store$data
    })
    # view btn
    observeEvent(input$view, { View(store$data$meta) })
    # save meta btn
    observeEvent(input$save, {
      fn <- paste0('mtmeta', as.integer(Sys.time()), '.csv')
      write.csv(store$data$meta, fn, row.names=F)
      show('savemsg')
    })
    # save json btn
    observeEvent(input$saveschm, {
      fn <- paste0('mtschema', as.integer(Sys.time()), '.json')
      write(toJSON(store$data$schema), fn)
      show('schmsg')
    })
  }
  # --------------------------------------------------------------------------
  runGadget(ui, server, viewer=dialogViewer('mt - get meta info from webpages'))
}
# --------------------------------------------------------------------------
mtInit()